import { defaultFilter } from "cmdk";
import type { SymbolItem } from "@/lib/market-data";

/** cmdk と同じ照合・順位を描画前に適用する。同点は API の銘柄順を保つ。 */
export function searchSymbols(symbols: SymbolItem[], query: string): SymbolItem[] {
  return symbols
    .map((symbol, index) => ({
      symbol,
      index,
      score: defaultFilter(`${symbol.code} ${symbol.name}`, query),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ symbol }) => symbol);
}
