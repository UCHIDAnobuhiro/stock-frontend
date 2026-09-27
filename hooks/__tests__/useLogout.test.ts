import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLogout } from "@/hooks/useLogout";

// ---- モック設定 ----

const { mockReplace, mockDelete, mockMutate } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockDelete: vi.fn(),
  mockMutate: vi.fn(),
}));

vi.mock("react-router", () => ({
  useNavigate: () => mockReplace,
}));

vi.mock("@/lib/api", () => ({
  default: { DELETE: mockDelete },
}));

vi.mock("swr", () => ({
  useSWRConfig: () => ({ mutate: mockMutate }),
}));

// ---- テスト ----

describe("useLogout", () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockDelete.mockResolvedValue({ data: { message: "ok" }, response: { status: 200, ok: true } });
    mockMutate.mockResolvedValue(undefined);
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it("handleLogout で DELETE /v1/logout が呼ばれる", async () => {
    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current.handleLogout();
    });

    expect(mockDelete).toHaveBeenCalledWith("/v1/logout");
  });

  it("handleLogout でログインページへリダイレクトされる", async () => {
    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current.handleLogout();
    });

    expect(mockReplace).toHaveBeenCalledWith("/login", { replace: true });
  });

  it("通信失敗ならCookieが残り得るため遷移せず再試行を促す", async () => {
    mockDelete.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current.handleLogout();
    });

    expect(mockReplace).not.toHaveBeenCalled();
    expect(result.current.logoutError).toContain("ログアウトできませんでした");
    expect(consoleWarnSpy).toHaveBeenCalledWith("Logout request failed:", expect.any(Error));
  });

  it("handleLogout で SWR キャッシュが全破棄される", async () => {
    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current.handleLogout();
    });

    expect(mockMutate).toHaveBeenCalledWith(expect.any(Function), undefined, {
      revalidate: false,
    });

    // 第1引数のフィルタ関数が任意のキーに対して true を返すことを確認
    const filterFn = mockMutate.mock.calls[0][0];
    expect(filterFn("any-key")).toBe(true);
    expect(filterFn(undefined)).toBe(true);
  });

  it("通信失敗なら認証中のキャッシュを破棄しない", async () => {
    mockDelete.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current.handleLogout();
    });

    expect(mockMutate).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith("Logout request failed:", expect.any(Error));
  });

  it("サーバーが5xxを返す場合もCookie残存を前提に画面を維持する", async () => {
    mockDelete.mockResolvedValue({ response: { status: 503, ok: false } });
    const { result } = renderHook(() => useLogout());
    await act(async () => { await result.current.handleLogout(); });
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockMutate).not.toHaveBeenCalled();
    expect(result.current.logoutError).not.toBeNull();
  });
});
