import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import useSWR, { SWRConfig } from "swr";
import Home from "@/app/page";
import { fetchSymbolsServer } from "@/lib/api.server";
import { SymbolsFallback } from "@/components/providers/SymbolsProvider";
import type { SymbolItem } from "@/lib/market-data";

const { clientFetch } = vi.hoisted(() => ({ clientFetch: vi.fn(() => new Promise<SymbolItem[]>(() => {})) }));

vi.mock("@/lib/api.server", () => ({ fetchSymbolsServer: vi.fn() }));
vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <>
      <div>シェル</div>
      {children}
      <Suspense fallback={<div>一覧待機中</div>}>
        <SymbolsFallback><SymbolList /></SymbolsFallback>
      </Suspense>
    </>
  ),
}));
vi.mock("@/components/chart/ChartContainer", () => ({
  ChartContainer: () => <div>チャート取得開始</div>,
}));

function SymbolList() {
  const { data } = useSWR("/v1/symbols", clientFetch);
  return <div>銘柄: {data?.map((symbol) => symbol.code).join(",") ?? "未取得"}</div>;
}

function deferredSymbols() {
  let resolve!: (symbols: SymbolItem[] | null) => void;
  const promise = new Promise<SymbolItem[] | null>((complete) => { resolve = complete; });
  return { promise, resolve };
}

async function renderPage() {
  await act(async () => {
    render(
      <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>
        <Home />
      </SWRConfig>,
    );
  });
}

const mockFetchSymbolsServer = vi.mocked(fetchSymbolsServer);

describe("Home", () => {
  beforeEach(() => vi.clearAllMocks());

  it("一覧待機中もシェルとチャートを表示し、成功結果をSWR fallbackへ渡す", async () => {
    const pending = deferredSymbols();
    mockFetchSymbolsServer.mockReturnValue(pending.promise);
    await renderPage();

    expect(screen.getByText("シェル")).toBeTruthy();
    expect(screen.getByText("チャート取得開始")).toBeTruthy();
    expect(screen.getByText("一覧待機中")).toBeTruthy();
    expect(mockFetchSymbolsServer).toHaveBeenCalledTimes(1);

    await act(async () => pending.resolve([{ code: "7203", name: "トヨタ自動車", logo_url: null }]));
    await waitFor(() => expect(screen.getByText("銘柄: 7203")).toBeTruthy());
  });

  it("正常な空配列もfallbackとして扱う", async () => {
    const pending = deferredSymbols();
    mockFetchSymbolsServer.mockReturnValue(pending.promise);
    await renderPage();
    await act(async () => pending.resolve([]));

    await waitFor(() => expect(screen.getByText(/銘柄:/).textContent).toBe("銘柄: "));
  });

  it("SSRで取得できなければfallbackを設定せずクライアント取得を開始する", async () => {
    const pending = deferredSymbols();
    mockFetchSymbolsServer.mockReturnValue(pending.promise);
    await renderPage();
    await act(async () => pending.resolve(null));

    await waitFor(() => expect(screen.getByText("銘柄: 未取得")).toBeTruthy());
    await waitFor(() => expect(clientFetch).toHaveBeenCalledTimes(1));
  });
});
