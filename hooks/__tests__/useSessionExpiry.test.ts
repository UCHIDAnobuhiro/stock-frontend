import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSessionExpiry } from "@/hooks/useSessionExpiry";

// ---- モック設定 ----

vi.mock("@/lib/api", () => ({
  default: { use: vi.fn() },
  TOKEN_KEY: "stock_jwt",
  SESSION_EXPIRED_EVENT: "session:expired",
}));

const { mockIsTokenValid } = vi.hoisted(() => ({
  mockIsTokenValid: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  isTokenValid: mockIsTokenValid,
}));

// ---- テスト ----

describe("useSessionExpiry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.removeItem("stock_jwt");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("初期状態では isExpired が false", () => {
    const { result } = renderHook(() => useSessionExpiry());
    expect(result.current.isExpired).toBe(false);
  });

  it("ポーリング: トークンが期限切れのとき isExpired が true になる", () => {
    localStorage.setItem("stock_jwt", "expired-token");
    mockIsTokenValid.mockReturnValue(false);

    const { result } = renderHook(() => useSessionExpiry());

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current.isExpired).toBe(true);
  });

  it("ポーリング: トークンが有効なとき isExpired は false のまま", () => {
    localStorage.setItem("stock_jwt", "valid-token");
    mockIsTokenValid.mockReturnValue(true);

    const { result } = renderHook(() => useSessionExpiry());

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current.isExpired).toBe(false);
  });

  it("ポーリング: 期限切れ検知時にトークンが localStorage から削除される", () => {
    localStorage.setItem("stock_jwt", "expired-token");
    mockIsTokenValid.mockReturnValue(false);

    renderHook(() => useSessionExpiry());

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(localStorage.getItem("stock_jwt")).toBeNull();
  });

  it("イベント: session:expired を dispatch すると isExpired が true になる", () => {
    const { result } = renderHook(() => useSessionExpiry());

    act(() => {
      window.dispatchEvent(new CustomEvent("session:expired"));
    });

    expect(result.current.isExpired).toBe(true);
  });

  it("イベント: session:expired 検知時にトークンが localStorage から削除される", () => {
    localStorage.setItem("stock_jwt", "some-token");

    renderHook(() => useSessionExpiry());

    act(() => {
      window.dispatchEvent(new CustomEvent("session:expired"));
    });

    expect(localStorage.getItem("stock_jwt")).toBeNull();
  });

  it("冪等性: expire が複数回呼ばれてもエラーなく isExpired が true のまま", () => {
    const { result } = renderHook(() => useSessionExpiry());

    act(() => {
      window.dispatchEvent(new CustomEvent("session:expired"));
      window.dispatchEvent(new CustomEvent("session:expired"));
      window.dispatchEvent(new CustomEvent("session:expired"));
    });

    expect(result.current.isExpired).toBe(true);
  });

  it("クリーンアップ: アンマウント後はイベントに反応しない", () => {
    const { result, unmount } = renderHook(() => useSessionExpiry());

    unmount();

    act(() => {
      window.dispatchEvent(new CustomEvent("session:expired"));
    });

    expect(result.current.isExpired).toBe(false);
  });

  it("クリーンアップ: アンマウント後はポーリングに反応しない", () => {
    localStorage.setItem("stock_jwt", "expired-token");
    mockIsTokenValid.mockReturnValue(false);

    const { result, unmount } = renderHook(() => useSessionExpiry());

    unmount();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current.isExpired).toBe(false);
  });
});
