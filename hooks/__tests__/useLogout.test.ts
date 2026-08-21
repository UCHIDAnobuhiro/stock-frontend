import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLogout } from "@/hooks/useLogout";

// ---- モック設定 ----

const { mockReplace, mockDelete, mockMutate } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockDelete: vi.fn(),
  mockMutate: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
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
    mockDelete.mockResolvedValue({ data: { message: "ok" }, response: { status: 200 } });
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

    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("API がエラーを返してもリダイレクトされる", async () => {
    mockDelete.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current.handleLogout();
    });

    expect(mockReplace).toHaveBeenCalledWith("/login");
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

  it("API がエラーを返してもキャッシュは破棄される", async () => {
    mockDelete.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current.handleLogout();
    });

    expect(mockMutate).toHaveBeenCalledWith(expect.any(Function), undefined, {
      revalidate: false,
    });
    expect(consoleWarnSpy).toHaveBeenCalledWith("Logout request failed:", expect.any(Error));
  });
});
