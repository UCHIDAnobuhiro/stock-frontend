import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLogoDetect } from "@/hooks/useLogoDetect";

// ---- モック設定 ----
// vi.mock はファイル先頭にホイストされるため、vi.hoisted で事前に変数を初期化する
// useSWRMutation は fetcher をそのまま呼び出す簡易実装に差し替え、
// detectLogo 内のステータス別エラーハンドリングを直接検証する。

const { mockPost } = vi.hoisted(() => ({
  mockPost: vi.fn(),
}));

vi.mock("swr/mutation", () => ({
  default: (
    key: string,
    fetcher: (key: string, opts: { arg: File }) => Promise<unknown>
  ) => ({
    trigger: (arg: File) => fetcher(key, { arg }),
    data: undefined,
    isMutating: false,
    error: undefined,
    reset: vi.fn(),
  }),
}));

vi.mock("@/lib/api", () => ({
  default: { POST: mockPost },
}));

// ---- ヘルパー ----

const fakeFile = () => new File(["dummy"], "logo.png", { type: "image/png" });

// ---- テスト ----

describe("useLogoDetect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("成功時は検出結果を返す", async () => {
    const results = [{ name: "Example Corp" }];
    mockPost.mockResolvedValue({
      data: results,
      error: null,
      response: { status: 200 },
    });

    const { result } = renderHook(() => useLogoDetect());

    await expect(result.current.detect(fakeFile())).resolves.toEqual(results);
  });

  it("413 のとき画像サイズエラーメッセージになる", async () => {
    mockPost.mockResolvedValue({
      data: null,
      error: {},
      response: { status: 413 },
    });

    const { result } = renderHook(() => useLogoDetect());

    await expect(result.current.detect(fakeFile())).rejects.toThrow(
      "画像サイズが大きすぎます（最大10MB）"
    );
  });

  it("429 のときレート制限エラーメッセージになる", async () => {
    mockPost.mockResolvedValue({
      data: null,
      error: {},
      response: { status: 429 },
    });

    const { result } = renderHook(() => useLogoDetect());

    await expect(result.current.detect(fakeFile())).rejects.toThrow(
      "リクエストが多すぎます。しばらく時間をおいてから再度お試しください"
    );
  });

  it("503 のときサービス利用不可のエラーメッセージになる", async () => {
    mockPost.mockResolvedValue({
      data: null,
      error: {},
      response: { status: 503 },
    });

    const { result } = renderHook(() => useLogoDetect());

    await expect(result.current.detect(fakeFile())).rejects.toThrow(
      "サービスが一時的に利用できません。時間をおいて再度お試しください"
    );
  });

  it("その他のステータスのとき汎用エラーメッセージになる", async () => {
    mockPost.mockResolvedValue({
      data: null,
      error: {},
      response: { status: 500 },
    });

    const { result } = renderHook(() => useLogoDetect());

    await expect(result.current.detect(fakeFile())).rejects.toThrow(
      "ロゴ検出に失敗しました"
    );
  });
});
