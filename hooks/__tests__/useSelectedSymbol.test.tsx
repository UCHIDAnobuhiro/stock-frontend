import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router";
import { useSelectedSymbol } from "@/hooks/useSelectedSymbol";

function useHarness() {
  return { ...useSelectedSymbol(), location: useLocation(), navigate: useNavigate() };
}

function renderAt(path: string) {
  return renderHook(useHarness, {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>,
  });
}

it("URLの銘柄・時間足を読み取り、空の銘柄は未選択にする", () => {
  const { result } = renderAt("/?symbol=&interval=1week");
  expect(result.current.symbol).toBeNull();
  expect(result.current.interval).toBe("1week");
});

it("銘柄変更で他のクエリを保ち、戻る操作で元の銘柄へ戻す", () => {
  const { result } = renderAt("/?symbol=AAPL&interval=1week&source=dashboard");
  act(() => result.current.setSymbol("MSFT"));
  expect(result.current.location.search).toBe("?symbol=MSFT&interval=1week&source=dashboard");
  act(() => result.current.navigate(-1));
  expect(result.current.symbol).toBe("AAPL");
});

it("初期銘柄のreplaceは履歴を増やさず、intervalリセットを反映する", () => {
  const { result } = renderAt("/?interval=1month&source=dashboard");
  act(() => result.current.replaceSymbol("MSFT", false));
  expect(result.current.location.search).toBe("?interval=1day&source=dashboard&symbol=MSFT");
  act(() => result.current.navigate(-1));
  expect(result.current.symbol).toBe("MSFT");
});

it("連続操作で銘柄と時間足を保ち、hashも残す", () => {
  const { result } = renderAt("/?source=dashboard#chart");
  act(() => {
    result.current.setSymbol("AAPL");
    result.current.setInterval("1week");
  });
  expect(result.current.location.search).toBe("?source=dashboard&symbol=AAPL&interval=1week");
  expect(result.current.location.hash).toBe("#chart");
});
