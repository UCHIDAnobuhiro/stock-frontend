import { describe, it, expect } from "vitest";
import { ApiError, createApiError } from "@/lib/api";

describe("ApiError", () => {
  it("status と message を保持する", () => {
    const error = new ApiError(404, "データが見つかりませんでした");

    expect(error.status).toBe(404);
    expect(error.message).toBe("データが見つかりませんでした");
    expect(error.name).toBe("ApiError");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
  });
});

describe("createApiError", () => {
  it("401 のときセッション切れメッセージを返す", () => {
    const error = createApiError(401, "デフォルトメッセージ");
    expect(error.message).toBe("セッションの有効期限が切れました。再度ログインしてください");
  });

  it("403 のとき共通の拒否メッセージを返す", () => {
    const error = createApiError(403, "デフォルトメッセージ");
    expect(error.message).toBe("リクエストが拒否されました。ページを再読み込みして再度お試しください");
  });

  it("404 のとき「データが見つかりませんでした」を返す", () => {
    const error = createApiError(404, "デフォルトメッセージ");
    expect(error.message).toBe("データが見つかりませんでした");
  });

  it.each([500, 502, 503])("%i 番のときサーバーエラーメッセージを返す", (status) => {
    const error = createApiError(status, "デフォルトメッセージ");
    expect(error.message).toBe("サーバーエラーが発生しました。時間をおいて再度お試しください");
  });

  it("マッピング外のステータスのとき defaultMessage を返す", () => {
    const error = createApiError(400, "デフォルトメッセージ");
    expect(error.message).toBe("デフォルトメッセージ");
  });

  it("499 のとき defaultMessage を返す（500番台の境界）", () => {
    const error = createApiError(499, "デフォルトメッセージ");
    expect(error.message).toBe("デフォルトメッセージ");
  });

  it("status を ApiError に保持する", () => {
    const error = createApiError(418, "デフォルトメッセージ");
    expect(error.status).toBe(418);
  });
});
