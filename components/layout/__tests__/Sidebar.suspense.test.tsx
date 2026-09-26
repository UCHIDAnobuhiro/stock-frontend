import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Sidebar from "@/components/layout/Sidebar";
import { SymbolsProvider } from "@/components/providers/SymbolsProvider";

describe("非表示サイドバーと銘柄一覧の待機", () => {
  it("閉じている間は一覧のSuspenseを起動せず、開いた時だけ待機表示する", async () => {
    const symbolsPromise = new Promise<null>(() => {});
    const { rerender } = render(
      <SymbolsProvider promise={symbolsPromise}>
        <Sidebar active={false} />
      </SymbolsProvider>,
    );
    expect(screen.queryByText("銘柄一覧を読み込んでいます…")).toBeNull();

    await act(async () => {
      rerender(
        <SymbolsProvider promise={symbolsPromise}>
          <Sidebar active />
        </SymbolsProvider>,
      );
    });
    expect(screen.getByText("銘柄一覧を読み込んでいます…")).toBeTruthy();

    await act(async () => {
      rerender(
        <SymbolsProvider promise={symbolsPromise}>
          <Sidebar active={false} />
        </SymbolsProvider>,
      );
    });
    expect(screen.queryByText("銘柄一覧を読み込んでいます…")).toBeNull();
  });
});
