import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSelectedSymbol } from "@/hooks/useSelectedSymbol";

const { mockUseSearchParams } = vi.hoisted(() => ({
  mockUseSearchParams: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => mockUseSearchParams(),
}));

describe("useSelectedSymbol", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/");
    vi.clearAllMocks();
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
  });

  it("空のsymbolは未選択として扱う", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("symbol=&interval=1week"));

    const { result } = renderHook(() => useSelectedSymbol());

    expect(result.current.symbol).toBeNull();
    expect(result.current.interval).toBe("1week");
  });

  it("symbolの前後空白を除去して返す", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("symbol=%20AAPL%20"));

    const { result } = renderHook(() => useSelectedSymbol());

    expect(result.current.symbol).toBe("AAPL");
  });

  it("setSymbolは既存queryを保持してpushする", () => {
    window.history.replaceState(null, "", "/?interval=1week&display=compact");
    const pushState = vi.spyOn(window.history, "pushState");
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams("interval=1week&display=compact")
    );
    const { result } = renderHook(() => useSelectedSymbol());

    act(() => result.current.setSymbol("AAPL"));

    expect(pushState).toHaveBeenCalledWith(null, "", "/?interval=1week&display=compact&symbol=AAPL");
    expect(window.location.search).toBe("?interval=1week&display=compact&symbol=AAPL");
  });

  it("replaceSymbolは既存queryを保持してreplaceする", () => {
    window.history.replaceState(null, "", "/?interval=1month&source=dashboard");
    const replaceState = vi.spyOn(window.history, "replaceState");
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams("interval=1month&source=dashboard")
    );
    const { result } = renderHook(() => useSelectedSymbol());

    act(() => result.current.replaceSymbol("MSFT"));

    expect(replaceState).toHaveBeenCalledWith(null, "", "/?interval=1month&source=dashboard&symbol=MSFT");
    expect(window.location.search).toBe("?interval=1month&source=dashboard&symbol=MSFT");
  });

  it("keepInterval=falseではintervalを1dayに戻す", () => {
    window.history.replaceState(null, "", "/?interval=1month&source=dashboard");
    const replaceState = vi.spyOn(window.history, "replaceState");
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams("interval=1month&source=dashboard")
    );
    const { result } = renderHook(() => useSelectedSymbol());

    act(() => result.current.replaceSymbol("MSFT", false));

    expect(replaceState).toHaveBeenCalledWith(null, "", "/?interval=1day&source=dashboard&symbol=MSFT");
  });

  it("setIntervalは銘柄と他のqueryを保持してpushする", () => {
    window.history.replaceState(null, "", "/?symbol=AAPL&source=dashboard&interval=1day");
    const pushState = vi.spyOn(window.history, "pushState");
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams("symbol=AAPL&source=dashboard&interval=1day")
    );
    const { result } = renderHook(() => useSelectedSymbol());

    act(() => result.current.setInterval("1week"));

    expect(pushState).toHaveBeenCalledWith(null, "", "/?symbol=AAPL&source=dashboard&interval=1week");
  });

  it("URL更新が再レンダー前に続いても直前の銘柄を保持する", () => {
    const { result } = renderHook(() => useSelectedSymbol());

    act(() => {
      result.current.setSymbol("AAPL");
      result.current.setInterval("1week");
    });

    expect(window.location.search).toBe("?symbol=AAPL&interval=1week");
  });
});
