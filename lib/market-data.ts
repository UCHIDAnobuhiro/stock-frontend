import type { components } from "./generated/schema";

/** UI・フック・純粋関数で共有する市場データの型。API の型は生成元を参照する。 */
export type Interval = "1day" | "1week" | "1month";
export type CandleResponse = components["schemas"]["CandleResponse"];
export type CandlesResponse = components["schemas"]["CandlesResponse"];
export type SymbolItem = components["schemas"]["SymbolItem"];
export type QuoteResponse = components["schemas"]["QuoteResponse"];
export type QuoteFailureResponse = components["schemas"]["QuoteFailureResponse"];

export const isInterval = (value: string | null): value is Interval =>
  value === "1day" || value === "1week" || value === "1month";
