import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLogout } from "@/hooks/useLogout";

// ---- モック設定 ----
// vi.mock はファイル先頭にホイストされるため、vi.hoisted で事前に変数を初期化する

const { mockReplace } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

// lib/api はモジュールロード時に環境変数チェックで throw するためモックが必要
vi.mock("@/lib/api", () => ({
  default: { POST: vi.fn() },
  TOKEN_KEY: "stock_jwt",
}));

// ---- テスト ----

describe("useLogout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem("stock_jwt");
  });

  it("handleLogout で JWT が localStorage から削除される", async () => {
    localStorage.setItem("stock_jwt", "dummy-token");

    const { result } = renderHook(() => useLogout());

    act(() => {
      result.current.handleLogout();
    });

    expect(localStorage.getItem("stock_jwt")).toBeNull();
  });

  it("handleLogout でログインページへリダイレクトされる", async () => {
    const { result } = renderHook(() => useLogout());

    act(() => {
      result.current.handleLogout();
    });

    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("localStorage にトークンがなくてもエラーなくリダイレクトされる", async () => {
    const { result } = renderHook(() => useLogout());

    act(() => {
      result.current.handleLogout();
    });

    expect(mockReplace).toHaveBeenCalledWith("/login");
  });
});
