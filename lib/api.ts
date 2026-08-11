import createClient from "openapi-fetch";
import type { paths } from "./generated/schema";
import { getCsrfToken } from "./auth";
import { API_BASE } from "./api-base";
import { createAuthFetch, isRefreshEligible } from "./auth-refresh";

export { API_BASE } from "./api-base";

const SAFE_HTTP_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * openapi-fetch で生成された型安全な API クライアント。
 * Cookie 認証（HttpOnly auth_token）＋ Double Submit CSRF パターンを使用。
 */
const apiClient = createClient<paths>({
  baseUrl: API_BASE,
  credentials: "include",
  fetch: createAuthFetch(),
});

/**
 * リクエストミドルウェア。
 * 安全メソッド（GET / HEAD / OPTIONS）以外に X-CSRF-Token ヘッダーを付与する。
 * csrf_token Cookie が存在しない場合はヘッダーをセットしない（サーバーが 403 を返す）。
 */
apiClient.use({
  onRequest({ request }) {
    const method = request.method.toUpperCase();
    if (!SAFE_HTTP_METHODS.has(method)) {
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
 * refresh と元リクエスト再送後も 401 の場合、セッション切れイベントを発火する。
 */
apiClient.use({
  onResponse({ request, response }) {
    if (
      response.status === 401 &&
      isRefreshEligible(request) &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    }
    return response;
  },
});

/**
 * API エラーを HTTP ステータスコード付きで表現するエラークラス。
 * フェッチャーはこのクラスを throw し、UI 層は message（必要なら status）で表示を分岐する。
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** ステータスコード共通のエラーメッセージ対応表 */
const STATUS_MESSAGES: Record<number, string> = {
  401: "セッションの有効期限が切れました。再度ログインしてください",
  403: "リクエストが拒否されました。ページを再読み込みして再度お試しください",
  404: "データが見つかりませんでした",
  413: "ファイルサイズが大きすぎます。10MB以下の画像を選択してください",
};

/**
 * HTTP ステータスに応じたメッセージを持つ ApiError を生成する。
 * 401/403/404/413 は共通メッセージ、500番台はサーバーエラーメッセージ、
 * それ以外は呼び出し元が指定する defaultMessage を使う。
 */
export function createApiError(status: number, defaultMessage: string): ApiError {
  const message =
    STATUS_MESSAGES[status] ??
    (status >= 500
      ? "サーバーエラーが発生しました。時間をおいて再度お試しください"
      : defaultMessage);
  return new ApiError(status, message);
}

export default apiClient;
