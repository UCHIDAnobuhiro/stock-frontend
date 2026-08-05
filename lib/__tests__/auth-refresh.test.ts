import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAuthFetch } from "@/lib/auth-refresh";

const { mockGetCsrfToken } = vi.hoisted(() => ({
  mockGetCsrfToken: vi.fn<() => string | null>(),
}));

vi.mock("@/lib/auth", () => ({
  getCsrfToken: mockGetCsrfToken,
}));

function request(path: string, init?: RequestInit): Request {
  return new Request(`http://localhost${path}`, init);
}

function requestUrl(input: RequestInfo | URL): string {
  return input instanceof Request ? input.url : String(input);
}

describe("createAuthFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCsrfToken.mockReturnValue("csrf-before");
  });

  it("保護APIの401後にrefreshし、成功したら元リクエストを1回再送する", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    const authFetch = createAuthFetch({ fetchImpl });

    const response = await authFetch(request("/v1/symbols"));

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(requestUrl(fetchImpl.mock.calls[1][0])).toBe("/v1/auth/refresh");
    expect(fetchImpl.mock.calls[1][1]).toMatchObject({
      method: "POST",
      credentials: "include",
    });
    expect(
      new Headers(fetchImpl.mock.calls[1][1]?.headers).get("X-CSRF-Token"),
    ).toBe("csrf-before");
    expect(requestUrl(fetchImpl.mock.calls[2][0])).toBe(
      "http://localhost/v1/symbols",
    );
  });

  it("既存Requestに第2引数のinitをマージしてfetchへ渡す", async () => {
    const controller = new AbortController();
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 200 }));
    const authFetch = createAuthFetch({ fetchImpl });
    const original = request("/v1/symbols", {
      credentials: "same-origin",
      headers: { "X-Original": "original" },
    });

    await authFetch(original, {
      credentials: "include",
      headers: { "X-Override": "override" },
      signal: controller.signal,
    });

    const mergedRequest = fetchImpl.mock.calls[0][0] as Request;
    expect(mergedRequest).not.toBe(original);
    expect(mergedRequest.credentials).toBe("include");
    expect(mergedRequest.headers.get("X-Override")).toBe("override");
    expect(mergedRequest.headers.has("X-Original")).toBe(false);
    expect(mergedRequest.signal.aborted).toBe(false);
    controller.abort();
    expect(mergedRequest.signal.aborted).toBe(true);
  });

  it("refresh後の更新系リクエストにはローテーション後のCSRFトークンを設定する", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = requestUrl(input);
      if (url === "/v1/auth/refresh") {
        mockGetCsrfToken.mockReturnValue("csrf-after");
        return new Response(null, { status: 200 });
      }
      return fetchImpl.mock.calls.length === 1
        ? new Response(null, { status: 401 })
        : new Response(null, { status: 200 });
    });
    const authFetch = createAuthFetch({ fetchImpl });
    const original = request("/v1/watchlist", {
      method: "POST",
      headers: { "X-CSRF-Token": "csrf-before" },
      body: JSON.stringify({ code: "7203" }),
    });

    await authFetch(original);

    const retriedRequest = fetchImpl.mock.calls[2][0] as Request;
    expect(retriedRequest.headers.get("X-CSRF-Token")).toBe("csrf-after");
    expect(await retriedRequest.clone().text()).toBe(JSON.stringify({ code: "7203" }));
  });

  it("同時に複数の401が発生してもrefreshを単一化する", async () => {
    let resolveRefresh!: (response: Response) => void;
    const refreshResponse = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = requestUrl(input);
      if (url === "/v1/auth/refresh") return refreshResponse;
      const callsForUrl = fetchImpl.mock.calls.filter(
        ([calledInput]) => requestUrl(calledInput) === url,
      ).length;
      return new Response(null, { status: callsForUrl === 1 ? 401 : 200 });
    });
    const authFetch = createAuthFetch({ fetchImpl });

    const first = authFetch(request("/v1/symbols"));
    const second = authFetch(request("/v1/watchlist"));
    await vi.waitFor(() => {
      expect(
        fetchImpl.mock.calls.filter(
          ([input]) => requestUrl(input) === "/v1/auth/refresh",
        ),
      ).toHaveLength(1);
    });
    resolveRefresh(new Response(null, { status: 200 }));

    const responses = await Promise.all([first, second]);
    expect(responses.map(({ status }) => status)).toEqual([200, 200]);
    expect(
      fetchImpl.mock.calls.filter(
        ([input]) => requestUrl(input) === "/v1/auth/refresh",
      ),
    ).toHaveLength(1);
  });

  it("先行refresh完了後に遅れて401が返っても再度refreshしない", async () => {
    let resolveDelayed401!: (response: Response) => void;
    const delayed401 = new Promise<Response>((resolve) => {
      resolveDelayed401 = resolve;
    });
    let symbolsCalls = 0;
    let watchlistCalls = 0;
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = requestUrl(input);
      if (url === "/v1/auth/refresh") {
        return new Response(null, { status: 200 });
      }
      if (url.endsWith("/v1/symbols")) {
        symbolsCalls += 1;
        return new Response(null, { status: symbolsCalls === 1 ? 401 : 200 });
      }
      watchlistCalls += 1;
      return watchlistCalls === 1
        ? delayed401
        : new Response(null, { status: 200 });
    });
    const authFetch = createAuthFetch({ fetchImpl });

    const first = authFetch(request("/v1/symbols"));
    const delayed = authFetch(request("/v1/watchlist"));
    expect((await first).status).toBe(200);
    resolveDelayed401(new Response(null, { status: 401 }));

    expect((await delayed).status).toBe(200);
    expect(
      fetchImpl.mock.calls.filter(
        ([input]) => requestUrl(input) === "/v1/auth/refresh",
      ),
    ).toHaveLength(1);
  });

  it("refreshが409ならRetry-Afterを待って1回だけ再試行する", async () => {
    const sleep = vi.fn(async () => undefined);
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(null, { status: 409, headers: { "Retry-After": "2" } }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const authFetch = createAuthFetch({ fetchImpl, sleep });

    const response = await authFetch(request("/v1/symbols"));

    expect(response.status).toBe(200);
    expect(sleep).toHaveBeenCalledWith(2_000);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it("409にRetry-Afterがなければ1秒待って1回だけ再試行する", async () => {
    const sleep = vi.fn(async () => undefined);
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 409 }))
      .mockResolvedValueOnce(new Response(null, { status: 409 }));
    const authFetch = createAuthFetch({ fetchImpl, sleep });

    const response = await authFetch(request("/v1/symbols"));

    expect(response.status).toBe(401);
    expect(sleep).toHaveBeenCalledWith(1_000);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("refresh失敗時は元の401を返し、元リクエストを再送しない", async () => {
    const original401 = new Response(null, { status: 401 });
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(original401)
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    const authFetch = createAuthFetch({ fetchImpl });

    const response = await authFetch(request("/v1/symbols"));

    expect(response).toBe(original401);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it.each(["/v1/login", "/v1/signup", "/v1/logout", "/v1/auth/refresh"])(
    "%sの401ではrefreshしない",
    async (path) => {
      const fetchImpl = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status: 401 }));
      const authFetch = createAuthFetch({ fetchImpl });

      const response = await authFetch(request(path, { method: "POST" }));

      expect(response.status).toBe(401);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    },
  );

  it("再送後も401ならrefreshを繰り返さない", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    const authFetch = createAuthFetch({ fetchImpl });

    const response = await authFetch(request("/v1/symbols"));

    expect(response.status).toBe(401);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});
