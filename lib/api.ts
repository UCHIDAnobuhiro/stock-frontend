import createClient from "openapi-fetch";
import type { paths } from "./generated/schema";
import { getCsrfToken } from "./auth";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/**
 * openapi-fetch で生成された型安全な API クライアント。
 * Cookie 認証（HttpOnly auth_token）＋ Double Submit CSRF パターンを使用。
 */
const apiClient = createClient<paths>({
  baseUrl: API_BASE,
  credentials: "include",
});

/**
 * リクエストミドルウェア。
 * 状態変更リクエスト（POST / PUT / DELETE）に X-CSRF-Token ヘッダーを付与する。
 * csrf_token Cookie が存在しない場合はヘッダーをセットしない（サーバーが 403 を返す）。
 */
apiClient.use({
  onRequest({ request }) {
    const method = request.method.toUpperCase();
    if (["POST", "PUT", "DELETE"].includes(method)) {
      const csrf = getCsrfToken();
      if (csrf) {
        request.headers.set("X-CSRF-Token", csrf);
      }
    }
    return request;
  },
});

/** セッション切れを通知するカスタムイベント名 */
export const SESSION_EXPIRED_EVENT = "session:expired" as const;

/**
 * レスポンスミドルウェア。
 * 401 レスポンスを受け取った場合、セッション切れイベントを発火する。
 */
apiClient.use({
  onResponse({ response }) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    }
    return response;
  },
});

export default apiClient;
