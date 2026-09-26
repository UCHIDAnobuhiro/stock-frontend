import { describe, expect, it } from "vitest";
import { searchSymbols } from "@/lib/symbol-search";
import type { SymbolItem } from "@/lib/market-data";

const symbols: SymbolItem[] = [
  { code: "APLE", name: "Apple Hospitality", logo_url: null },
  { code: "AAPL", name: "Apple Inc.", logo_url: null },
  { code: "7203", name: "トヨタ自動車", logo_url: null },
];

describe("searchSymbols", () => {
  it("cmdk の順位でコード・企業名を検索し、同点は元の順序を保つ", () => {
    expect(searchSymbols(symbols, "aapl").map((item) => item.code)[0]).toBe("AAPL");
    expect(searchSymbols(symbols, "apple").map((item) => item.code)).toEqual(["APLE", "AAPL"]);
    expect(searchSymbols(symbols, "トヨタ").map((item) => item.code)).toEqual(["7203"]);
    expect(searchSymbols(symbols, "APL").map((item) => item.code)).toEqual(["APLE", "AAPL"]);
    expect(searchSymbols(symbols, "no-match")).toEqual([]);
  });
});
