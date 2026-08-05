import { getCsrfToken } from "./auth";

const REFRESH_PATH = "/v1/auth/refresh";
const PUBLIC_AUTH_PATHS = new Set([
  "/v1/signup",
  "/v1/login",
  "/v1/logout",
  REFRESH_PATH,
]);
const MAX_CONFLICT_RETRY_DELAY_MS = 5_000;

type Sleep = (milliseconds: number) => Promise<void>;

interface AuthFetchOptions {
  fetchImpl?: typeof fetch;
  sleep?: Sleep;
}

function getApiPath(url: string): string {
  const pathname = new URL(url).pathname;
  const apiPathStart = pathname.indexOf("/v1/");
  return apiPathStart >= 0 ? pathname.slice(apiPathStart) : pathname;
}

export function isRefreshEligible(request: Request): boolean {
  const path = getApiPath(request.url);
  return !PUBLIC_AUTH_PATHS.has(path) && !path.startsWith("/v1/auth/oauth/");
}

function getConflictRetryDelay(response: Response): number {
  const retryAfter = response.headers.get("Retry-After");
  const seconds = retryAfter === null ? Number.NaN : Number(retryAfter);
  if (!Number.isFinite(seconds) || seconds <= 0) return 1_000;
  return Math.min(seconds * 1_000, MAX_CONFLICT_RETRY_DELAY_MS);
}

function createRefreshRequestInit(): RequestInit {
  const headers = new Headers();
  const csrfToken = getCsrfToken();
  if (csrfToken) headers.set("X-CSRF-Token", csrfToken);

  return {
    method: "POST",
    credentials: "include",
    headers,
  };
}

function withCurrentCsrfToken(request: Request): Request {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) {
    return request;
  }

  const headers = new Headers(request.headers);
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  } else {
    headers.delete("X-CSRF-Token");
  }
  return new Request(request, { headers });
}

/**
 * アクセストークン期限切れ時の refresh と元リクエスト再送を行う fetch。
 * 同一クライアント内の refresh は単一化し、409 の場合だけ1回再試行する。
 */
export function createAuthFetch({
  fetchImpl = globalThis.fetch,
  sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
}: AuthFetchOptions = {}): typeof fetch {
  let refreshPromise: Promise<boolean> | null = null;
  let refreshGeneration = 0;

  async function requestRefresh(): Promise<boolean> {
    const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
    const refreshUrl = `${baseUrl}${REFRESH_PATH}`;
    let response = await fetchImpl(refreshUrl, createRefreshRequestInit());

    if (response.status === 409) {
      await sleep(getConflictRetryDelay(response));
      response = await fetchImpl(refreshUrl, createRefreshRequestInit());
    }

    return response.ok;
  }

  function refreshOnce(): Promise<boolean> {
    if (!refreshPromise) {
      refreshPromise = requestRefresh()
        .then((refreshed) => {
          if (refreshed) refreshGeneration += 1;
          return refreshed;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }
    return refreshPromise;
  }

  return async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const eligible = isRefreshEligible(request);
    const retryRequest = eligible ? request.clone() : null;
    const generationAtRequest = refreshGeneration;
    const response = await fetchImpl(request);

    if (response.status !== 401 || !retryRequest) return response;

    if (generationAtRequest === refreshGeneration) {
      const refreshed = await refreshOnce();
      if (!refreshed) return response;
    }

    return fetchImpl(withCurrentCsrfToken(retryRequest));
  };
}
