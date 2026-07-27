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

let csrfMiddleware: RequestMiddleware;

describe("CSRFリクエストミドルウェア", () => {
  beforeAll(async () => {
    await import("@/lib/api");
    csrfMiddleware = mockUse.mock.calls[0][0] as RequestMiddleware;
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
