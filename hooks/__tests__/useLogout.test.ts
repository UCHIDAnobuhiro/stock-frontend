import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLogout } from "@/hooks/useLogout";

// ---- モック設定 ----

const { mockReplace, mockDelete } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("@/lib/api", () => ({
  default: { DELETE: mockDelete },
}));

// ---- テスト ----

describe("useLogout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDelete.mockResolvedValue({ data: { message: "ok" }, response: { status: 200 } });
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
  });
});
