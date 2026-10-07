import type { DndContextProps, DragEndEvent } from "@dnd-kit/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WatchlistPanel } from "@/components/watchlist/WatchlistPanel";
import { createSWRWrapper } from "@/tests/support/swr";

const { mockGet, mockDelete, mockPut } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockDelete: vi.fn(),
  mockPut: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/api")>(),
  default: { GET: mockGet, DELETE: mockDelete, PUT: mockPut },
}));
vi.mock("@/hooks/useSymbols", () => ({
  useSymbols: () => ({ symbols: [], isLoading: false, hasData: true }),
}));
vi.mock("@/hooks/useSelectedSymbol", () => ({
  useSelectedSymbol: () => ({ symbol: "AAPL", setSymbol: vi.fn() }),
}));
vi.mock("@/hooks/useQuotes", () => ({
  useQuotes: () => ({ quotes: new Map(), failures: new Map(), isLoading: false }),
}));
vi.mock("@/components/watchlist/WatchlistSymbolSearch", () => ({
  WatchlistSymbolSearch: () => null,
}));
vi.mock("@/components/watchlist/WatchlistItem", () => ({
  WatchlistItem: ({ code, onRemove }: { code: string; onRemove: () => void }) => (
    <div data-testid="watchlist-row">
      {code}<button onClick={onRemove}>{code}を削除</button>
    </div>
  ),
}));
vi.mock("@dnd-kit/core", async (importOriginal) => ({
  ...await importOriginal<typeof import("@dnd-kit/core")>(),
  DndContext: ({ children, onDragEnd }: DndContextProps) => (
    <div>
      <button onClick={() => onDragEnd?.({ active: { id: "AAPL" }, over: { id: "GOOGL" } } as DragEndEvent)}>
        並び替えを確定
      </button>
      {children}
    </div>
  ),
}));

const ITEMS = [
  { id: 1, symbol_code: "AAPL", sort_key: 0 },
  { id: 2, symbol_code: "GOOGL", sort_key: 1 },
];

describe("WatchlistPanel の更新失敗", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGet.mockResolvedValue({ data: ITEMS, response: new Response(null, { status: 200 }) });
  });

  it.each(["削除", "並び替え"] as const)("%sのAPI失敗を表示し、リストを復元して再試行できる", async (operation) => {
    const user = userEvent.setup();
    const mutation = operation === "削除" ? mockDelete : mockPut;
    mutation.mockResolvedValueOnce({ error: { error: "internal server error" }, response: new Response(null, { status: 500 }) });
    render(<WatchlistPanel viewMode="compact" onToggleViewMode={() => {}} listScrollTopRef={{ current: 0 }} />, {
      wrapper: createSWRWrapper(),
    });
    const buttonName = operation === "削除" ? "AAPLを削除" : "並び替えを確定";
    await user.click(await screen.findByRole("button", { name: buttonName }));

    expect((await screen.findByRole("alert")).textContent).toContain("サーバーエラーが発生しました");
    expect(screen.getAllByTestId("watchlist-row").map((row) => row.textContent)).toEqual([
      "AAPLAAPLを削除", "GOOGLGOOGLを削除",
    ]);
    expect(mutation).toHaveBeenCalledWith(
      operation === "削除" ? "/v1/watchlist/{code}" : "/v1/watchlist/order",
      operation === "削除" ? { params: { path: { code: "AAPL" } } } : { body: { codes: ["GOOGL", "AAPL"] } },
    );

    const updated = operation === "削除" ? [ITEMS[1]] : [ITEMS[1], ITEMS[0]];
    mockGet.mockResolvedValue({ data: updated, response: new Response(null, { status: 200 }) });
    mutation.mockResolvedValue({ response: new Response(null, { status: 204 }) });
    await user.click(screen.getByRole("button", { name: buttonName }));

    await waitFor(() => expect(mutation).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(screen.getAllByTestId("watchlist-row").map((row) => row.textContent)).toEqual(
      updated.map((item) => `${item.symbol_code}${item.symbol_code}を削除`),
    );
  });
});
