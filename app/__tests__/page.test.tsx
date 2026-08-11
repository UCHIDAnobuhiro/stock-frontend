import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import Home from "@/app/page";
import { fetchSymbolsServer } from "@/lib/api.server";

vi.mock("@/lib/api.server", () => ({
  fetchSymbolsServer: vi.fn(),
}));

vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/chart/ChartContainer", () => ({
  ChartContainer: () => null,
}));

const mockFetchSymbolsServer = vi.mocked(fetchSymbolsServer);

describe("Home", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("SSR で銘柄一覧を取得できた場合、SWR fallback に設定する", async () => {
    const symbols = [
      { code: "7203", name: "トヨタ自動車", logo_url: "https://example.com/logo.png" },
    ];
    mockFetchSymbolsServer.mockResolvedValue(symbols);

    const page = (await Home()) as ReactElement<{ value: { fallback: object } }>;

    expect(page.props.value.fallback).toEqual({ "/v1/symbols": symbols });
  });

  it("SSR 取得に失敗した場合、SWR fallback を設定しない", async () => {
    mockFetchSymbolsServer.mockResolvedValue(null);

    const page = (await Home()) as ReactElement<{ value: { fallback: object } }>;

    expect(page.props.value.fallback).toEqual({});
  });

  it("SSR が空配列を正常取得した場合、SWR fallback に設定する", async () => {
    mockFetchSymbolsServer.mockResolvedValue([]);

    const page = (await Home()) as ReactElement<{ value: { fallback: object } }>;

    expect(page.props.value.fallback).toEqual({ "/v1/symbols": [] });
  });
});
