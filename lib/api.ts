import createClient from "openapi-fetch";
import type { paths } from "./generated/schema";

/** localStorage に JWT トークンを保存する際のキー名 */
export const TOKEN_KEY = "stock_jwt";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
if (!baseUrl) throw new Error("NEXT_PUBLIC_API_BASE_URL is required");

/**
 * openapi-fetch で生成された型安全な API クライアント。
 * すべての API 呼び出しはこのクライアント経由で行う。
 */
const apiClient = createClient<paths>({
  baseUrl,
});

/**
 * リクエストミドルウェア。
 * ブラウザ環境のみで localStorage から JWT を取得し、
 * Authorization: Bearer ヘッダーとして全リクエストに自動付与する。
 * SSR 時はスキップされる。
 */
apiClient.use({
  onRequest({ request }) {
    if (typeof window !== "undefined") {
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      } catch {
        // storage が使えない環境では Authorization を付与せず続行
      }
    }
    return request;
  },
});

export default apiClient;
