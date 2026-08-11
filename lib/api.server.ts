import { cookies } from "next/headers";
import createClient from "openapi-fetch";
import type { paths } from "./generated/schema";
import { API_BASE } from "./api-base";
import type { SymbolItem } from "@/hooks/useSymbols";

/**
 * Server Component から `/v1/symbols` を取得する。
 * `credentials: "include"` はブラウザ専用のためサーバー側では効かず、
 * `next/headers` の `cookies()` から `auth_token` を明示的に読み取り
 * `Cookie` ヘッダーとして付与する。
 * 認証情報が無い場合や API エラー時は、正常な空配列と区別するため null を返す。
 */
export async function fetchSymbolsServer(): Promise<SymbolItem[] | null> {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth_token")?.value;
  if (!authToken) return null;

  const client = createClient<paths>({ baseUrl: API_BASE });
  const { data, error } = await client.GET("/v1/symbols", {
    headers: { Cookie: `auth_token=${authToken}` },
  });
  if (error) return null;
  return data ?? [];
}
