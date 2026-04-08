import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSessionExpiry } from "@/hooks/useSessionExpiry";

// ---- モック設定 ----

vi.mock("@/lib/api", () => ({
  default: { use: vi.fn() },
  SESSION_EXPIRED_EVENT: "session:expired",
}));

const { mockGetCsrfToken } = vi.hoisted(() => ({
  mockGetCsrfToken: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCsrfToken: mockGetCsrfToken,
}));

// ---- テスト ----

describe("useSessionExpiry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // デフォルト: csrf_token Cookie あり（セッション有効）
    mockGetCsrfToken.mockReturnValue("csrf-token-value");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("初期状態では isExpired が false", () => {
    const { result } = renderHook(() => useSessionExpiry());
    expect(result.current.isExpired).toBe(false);
  });

  it("ポーリング: csrf_token Cookie が null のとき isExpired が true になる", () => {
    mockGetCsrfToken.mockReturnValue(null);

    const { result } = renderHook(() => useSessionExpiry());

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current.isExpired).toBe(true);
  });

  it("ポーリング: csrf_token Cookie が存在するとき isExpired は false のまま", () => {
    mockGetCsrfToken.mockReturnValue("valid-csrf");

    const { result } = renderHook(() => useSessionExpiry());

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current.isExpired).toBe(false);
  });

  it("イベント: session:expired を dispatch すると isExpired が true になる", () => {
    const { result } = renderHook(() => useSessionExpiry());

    act(() => {
      window.dispatchEvent(new CustomEvent("session:expired"));
    });

    expect(result.current.isExpired).toBe(true);
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
    mockGetCsrfToken.mockReturnValue(null);

    const { result, unmount } = renderHook(() => useSessionExpiry());

    unmount();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current.isExpired).toBe(false);
  });
});
