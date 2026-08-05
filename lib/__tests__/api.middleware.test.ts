import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetCsrfToken, mockUse } = vi.hoisted(() => ({
  mockGetCsrfToken: vi.fn<() => string | null>(),
  mockUse: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCsrfToken: mockGetCsrfToken,
}));

vi.mock("openapi-fetch", () => ({
  default: vi.fn(() => ({
    use: mockUse,
  })),
}));

interface RequestMiddleware {
  onRequest(context: { request: Request }): Request;
}

interface ResponseMiddleware {
  onResponse(context: { request: Request; response: Response }): Response;
}

let csrfMiddleware: RequestMiddleware;
let sessionMiddleware: ResponseMiddleware;

describe("CSRFリクエストミドルウェア", () => {
  beforeAll(async () => {
    await import("@/lib/api");
    csrfMiddleware = mockUse.mock.calls[0][0] as RequestMiddleware;
    sessionMiddleware = mockUse.mock.calls[1][0] as ResponseMiddleware;
  });

  beforeEach(() => {
    mockGetCsrfToken.mockReset();
  });

  it.each(["POST", "PUT", "DELETE", "PATCH"])(
    "%sではCookieのCSRFトークンをヘッダーに設定する",
    (method) => {
      mockGetCsrfToken.mockReturnValue("csrf-token");
      const request = new Request("http://localhost/v1/resource", { method });

      csrfMiddleware.onRequest({ request });

      expect(request.headers.get("X-CSRF-Token")).toBe("csrf-token");
    },
  );

  it.each(["GET", "HEAD", "OPTIONS"])("%sではCSRFヘッダーを設定しない", (method) => {
    mockGetCsrfToken.mockReturnValue("csrf-token");
    const request = new Request("http://localhost/v1/resource", { method });

    csrfMiddleware.onRequest({ request });

    expect(request.headers.has("X-CSRF-Token")).toBe(false);
    expect(mockGetCsrfToken).not.toHaveBeenCalled();
  });

  it("CookieにCSRFトークンがない場合はヘッダーを設定しない", () => {
    mockGetCsrfToken.mockReturnValue(null);
    const request = new Request("http://localhost/v1/resource", { method: "POST" });

    csrfMiddleware.onRequest({ request });

    expect(request.headers.has("X-CSRF-Token")).toBe(false);
  });
});

describe("セッションレスポンスミドルウェア", () => {
  it("保護APIがrefresh後も401ならセッション切れイベントを発火する", () => {
    const listener = vi.fn();
    window.addEventListener("session:expired", listener);

    sessionMiddleware.onResponse({
      request: new Request("http://localhost/v1/symbols"),
      response: new Response(null, { status: 401 }),
    });

    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener("session:expired", listener);
  });

  it("ログインAPIの401ではセッション切れイベントを発火しない", () => {
    const listener = vi.fn();
    window.addEventListener("session:expired", listener);

    sessionMiddleware.onResponse({
      request: new Request("http://localhost/v1/login", { method: "POST" }),
      response: new Response(null, { status: 401 }),
    });

    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener("session:expired", listener);
  });
});
