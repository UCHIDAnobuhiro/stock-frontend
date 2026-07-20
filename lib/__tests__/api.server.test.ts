import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGet = vi.fn();
const mockCookiesGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mockCookiesGet,
  })),
}));

vi.mock("openapi-fetch", () => ({
  default: vi.fn(() => ({
    GET: mockGet,
    use: vi.fn(),
  })),
}));

describe("fetchSymbolsServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("auth_token Cookie がある場合、Cookie ヘッダー付きで /v1/symbols を取得する", async () => {
    mockCookiesGet.mockReturnValue({ value: "token123" });
    mockGet.mockResolvedValue({
      data: [{ code: "7203", name: "トヨタ自動車", logo_url: "https://example.com/logo.png" }],
      error: undefined,
    });

    const { fetchSymbolsServer } = await import("@/lib/api.server");
    const symbols = await fetchSymbolsServer();

    expect(mockGet).toHaveBeenCalledWith("/v1/symbols", {
      headers: { Cookie: "auth_token=token123" },
    });
    expect(symbols).toEqual([
      { code: "7203", name: "トヨタ自動車", logo_url: "https://example.com/logo.png" },
    ]);
  });

  it("auth_token Cookie が無い場合、API を呼ばずに空配列を返す", async () => {
    mockCookiesGet.mockReturnValue(undefined);

    const { fetchSymbolsServer } = await import("@/lib/api.server");
    const symbols = await fetchSymbolsServer();

    expect(mockGet).not.toHaveBeenCalled();
    expect(symbols).toEqual([]);
  });

  it("API がエラーを返す場合、空配列を返す", async () => {
    mockCookiesGet.mockReturnValue({ value: "token123" });
    mockGet.mockResolvedValue({ data: undefined, error: { message: "unauthorized" } });

    const { fetchSymbolsServer } = await import("@/lib/api.server");
    const symbols = await fetchSymbolsServer();

    expect(symbols).toEqual([]);
  });
});
