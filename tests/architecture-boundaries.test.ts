import { describe, expect, it } from "vitest";
import { ESLint } from "eslint";

const eslint = new ESLint();

async function ruleIds(filePath: string, source: string) {
  const [result] = await eslint.lintText(source, { filePath });
  return result.messages.map(({ ruleId }) => ruleId);
}

describe("依存方向の ESLint 境界", () => {
  it.each([
    ["lib/example.ts", 'import type { CandleResponse } from "@/hooks/useCandles";'],
    ["lib/example.ts", 'import { useCandles } from "../hooks/useCandles";'],
    ["lib/example.ts", 'import { CandlestickChart } from "@/components/chart/CandlestickChart";'],
    ["lib/example.ts", 'import { Page } from "../app/page";'],
    ["hooks/example.ts", 'import { CandlestickChart } from "@/components/chart/CandlestickChart";'],
    ["hooks/example.ts", 'const chart = import("../components/chart/CandlestickChart");'],
    ["hooks/example.ts", 'import { Page } from "@/app/page";'],
    ["components/example.ts", 'import { Page } from "../app/page";'],
    ["hooks/example.ts", 'import { fetchSymbolsServer } from "@/lib/api.server";'],
    ["components/example.ts", 'import { fetchSymbolsServer } from "../lib/api.server";'],
  ])("%s の逆向き import を検出する: %s", async (filePath, source) => {
    expect(await ruleIds(filePath, source)).toContain("import/no-restricted-paths");
  });

  it.each([
    'import apiClient from "@/lib/api";',
    'import { createApiError } from "../lib/api";',
    'import apiClient from "../lib/api.ts";',
  ])("UI からの API クライアント直参照を検出する: %s", async (source) => {
    expect(await ruleIds("components/example.ts", source)).toContain("no-restricted-imports");
  });

  it("UI からの API クライアントの動的 import を検出する", async () => {
    expect(await ruleIds("components/example.ts", 'const api = import("@/lib/api");'))
      .toContain("no-restricted-syntax");
  });

  it.each([
    ["components/chart/ChartContainer.tsx", 'import { ApiError } from "@/lib/api";'],
    ["components/chart/ChartContainer.tsx", 'import type { ApiError } from "../../lib/api.ts";'],
    ["app/page.tsx", 'import { fetchSymbolsServer } from "@/lib/api.server";'],
    ["hooks/useCandles.ts", 'import apiClient from "@/lib/api";'],
    ["components/auth/OAuthButtons.tsx", 'import { API_BASE } from "@/lib/api-base";'],
    ["hooks/__tests__/example.test.ts", 'import { CandlestickChart } from "@/components/chart/CandlestickChart";'],
  ])("許可された参照を通す: %s", async (filePath, source) => {
    const ids = await ruleIds(filePath, source);
    expect(ids).not.toContain("import/no-restricted-paths");
    expect(ids).not.toContain("no-restricted-imports");
  });
});
