import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSelectedSymbol } from "@/hooks/useSelectedSymbol";

const { mockPush, mockReplace, mockUseSearchParams } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockReplace: vi.fn(),
  mockUseSearchParams: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => mockUseSearchParams(),
}));

describe("useSelectedSymbol", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
  });

  it("空のsymbolは未選択として扱う", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("symbol=&interval=1week"));

    const { result } = renderHook(() => useSelectedSymbol());

    expect(result.current.symbol).toBeNull();
    expect(result.current.interval).toBe("1week");
  });

  it("setSymbolは既存queryを保持してpushする", () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams("interval=1week&display=compact")
    );
    const { result } = renderHook(() => useSelectedSymbol());

    act(() => result.current.setSymbol("AAPL"));

    expect(mockPush).toHaveBeenCalledWith(
      "/?interval=1week&display=compact&symbol=AAPL",
      { scroll: false }
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("replaceSymbolは既存queryを保持してreplaceする", () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams("interval=1month&source=dashboard")
    );
    const { result } = renderHook(() => useSelectedSymbol());

    act(() => result.current.replaceSymbol("MSFT"));

    expect(mockReplace).toHaveBeenCalledWith(
      "/?interval=1month&source=dashboard&symbol=MSFT",
      { scroll: false }
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("keepInterval=falseではintervalを1dayに戻す", () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams("interval=1month&source=dashboard")
    );
    const { result } = renderHook(() => useSelectedSymbol());

    act(() => result.current.replaceSymbol("MSFT", false));

    expect(mockReplace).toHaveBeenCalledWith(
      "/?interval=1day&source=dashboard&symbol=MSFT",
      { scroll: false }
    );
  });
});
