import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLogoAnalyze } from "@/hooks/useLogoAnalyze";

// ---- モック設定 ----
// vi.mock はファイル先頭にホイストされるため、vi.hoisted で事前に変数を初期化する
// useSWRMutation は fetcher をそのまま呼び出す簡易実装に差し替え、
// analyzeCompany 内のステータス別エラーハンドリングを直接検証する。

const { mockPost } = vi.hoisted(() => ({
  mockPost: vi.fn(),
}));

vi.mock("swr/mutation", () => ({
  default: (
    key: string,
    fetcher: (key: string, opts: { arg: string }) => Promise<unknown>
  ) => ({
    trigger: (arg: string) => fetcher(key, { arg }),
    data: undefined,
    isMutating: false,
    error: undefined,
    reset: vi.fn(),
  }),
}));

vi.mock("@/lib/api", () => ({
  default: { POST: mockPost },
}));

// ---- テスト ----

describe("useLogoAnalyze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("成功時は分析結果を返す", async () => {
    const analysis = { summary: "Example Corp is a technology company." };
    mockPost.mockResolvedValue({
      data: analysis,
      error: null,
      response: { status: 200 },
    });

    const { result } = renderHook(() => useLogoAnalyze());

    await expect(result.current.analyze("Example Corp")).resolves.toEqual(
      analysis
    );
  });

  it("429 のときレート制限エラーメッセージになる", async () => {
    mockPost.mockResolvedValue({
      data: null,
      error: {},
      response: { status: 429 },
    });

    const { result } = renderHook(() => useLogoAnalyze());

    await expect(result.current.analyze("Example Corp")).rejects.toThrow(
      "リクエストが多すぎます。しばらく時間をおいてから再度お試しください"
    );
  });

  it("503 のときサービス利用不可のエラーメッセージになる", async () => {
    mockPost.mockResolvedValue({
      data: null,
      error: {},
      response: { status: 503 },
    });

    const { result } = renderHook(() => useLogoAnalyze());

    await expect(result.current.analyze("Example Corp")).rejects.toThrow(
      "サービスが一時的に利用できません。時間をおいて再度お試しください"
    );
  });

  it("その他のステータスのとき汎用エラーメッセージになる", async () => {
    mockPost.mockResolvedValue({
      data: null,
      error: {},
      response: { status: 500 },
    });

    const { result } = renderHook(() => useLogoAnalyze());

    await expect(result.current.analyze("Example Corp")).rejects.toThrow(
      "企業分析に失敗しました"
    );
  });
});
