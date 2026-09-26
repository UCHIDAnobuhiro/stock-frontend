import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WatchlistSymbolSearch } from "@/components/watchlist/WatchlistSymbolSearch";
import type { SymbolItem } from "@/lib/market-data";

const symbols: SymbolItem[] = Array.from({ length: 120 }, (_, index) => ({
  code: `SYM${String(index).padStart(3, "0")}`,
  name: `Company ${index}`,
  logo_url: null,
}));

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { value: vi.fn(), configurable: true });
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

describe("WatchlistSymbolSearch", () => {
  it("50件だけ描画し、残件案内とページ操作で末尾の候補も選べる", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<WatchlistSymbolSearch symbols={symbols} isLoading={false} hasData onSelect={onSelect} />);

    const input = screen.getByPlaceholderText("銘柄コード・企業名で検索...");
    await user.type(input, "Company");
    expect(screen.getAllByRole("option")).toHaveLength(50);
    expect(screen.getByRole("status").textContent).toContain("残り70件");

    screen.getByRole("button", { name: "次の候補" }).focus();
    await user.keyboard("{Enter}");
    expect(screen.getAllByRole("option")).toHaveLength(50);
    await user.keyboard("{Enter}");
    expect(screen.getAllByRole("option")).toHaveLength(20);
    const last = screen.getByRole("option", { name: /SYM119/ });
    await user.click(last);
    expect(onSelect).toHaveBeenCalledWith("SYM119");
    expect((input as HTMLInputElement).value).toBe("");
  });

  it("入力変更時に先頭へ戻り、Enterで現在の候補を選べる", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<WatchlistSymbolSearch symbols={symbols} isLoading={false} hasData onSelect={onSelect} />);

    const input = screen.getByPlaceholderText("銘柄コード・企業名で検索...");
    await user.type(input, "Company");
    await user.click(screen.getByRole("button", { name: "次の候補" }));
    await user.click(input);
    await user.clear(input);
    await user.type(input, "SYM119");
    expect(screen.getByRole("option", { name: /SYM119/ })).toBeTruthy();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("SYM119");
  });

  it("取得済みの空データを読み込み表示にせず、フォーカス離脱で閉じる", async () => {
    const user = userEvent.setup();
    render(<><WatchlistSymbolSearch symbols={[]} isLoading hasData onSelect={vi.fn()} /><button>外側</button></>);
    const input = screen.getByPlaceholderText("銘柄コード・企業名で検索...");
    await user.type(input, "XYZ");
    expect(screen.getByText("銘柄が見つかりません")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "外側" }));
    expect((input as HTMLInputElement).value).toBe("");
    expect(screen.queryByText("銘柄が見つかりません")).toBeNull();
  });

  it("矢印キーで候補を移動してEnterで確定できる", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const matches = [
      { code: "APLE", name: "Apple Hospitality", logo_url: null },
      { code: "AAPL", name: "Apple Inc.", logo_url: null },
    ];
    render(<WatchlistSymbolSearch symbols={matches} isLoading={false} hasData onSelect={onSelect} />);
    await user.type(screen.getByPlaceholderText("銘柄コード・企業名で検索..."), "Apple");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onSelect).toHaveBeenCalledWith("AAPL");
  });
});
