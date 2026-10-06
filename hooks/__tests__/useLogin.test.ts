import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLogin } from "@/hooks/useLogin";

// ---- モック設定 ----
// vi.mock はファイル先頭にホイストされるため、vi.hoisted で事前に変数を初期化する

const { mockReplace, mockPost, mockUseSearchParams, mockFetchWatchlist } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockPost: vi.fn(),
  mockUseSearchParams: vi.fn(),
  mockFetchWatchlist: vi.fn(),
}));

vi.mock("react-router", () => ({
  useNavigate: () => mockReplace,
  useSearchParams: () => [mockUseSearchParams(), vi.fn()],
}));

vi.mock("@/lib/api", () => ({
  default: { POST: mockPost },
}));
vi.mock("@/hooks/useWatchlist", () => ({ fetchWatchlist: mockFetchWatchlist }));

// ---- ヘルパー ----

/** handleSubmit に渡すフェイクの FormEvent */
const fakeEvent = () =>
  ({ preventDefault: vi.fn() }) as unknown as React.SubmitEvent<HTMLFormElement>;

// ---- テスト ----

describe("useLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockFetchWatchlist.mockResolvedValue([]);
  });

  // バリデーション
  describe("validate", () => {
    it("メールアドレスが空のとき email エラーが設定される", async () => {
      const { result } = renderHook(() => useLogin());

      await act(async () => {
        result.current.setEmail("");
        result.current.setPassword("password");
      });
      await act(async () => {
        await result.current.handleSubmit(fakeEvent());
      });

      expect(result.current.fieldErrors.email).toBe(
        "メールアドレスを入力してください"
      );
      expect(mockPost).not.toHaveBeenCalled();
    });

    it("メールアドレスの形式が不正のとき email エラーが設定される", async () => {
      const { result } = renderHook(() => useLogin());

      await act(async () => {
        result.current.setEmail("not-an-email");
        result.current.setPassword("password");
      });
      await act(async () => {
        await result.current.handleSubmit(fakeEvent());
      });

      expect(result.current.fieldErrors.email).toBe(
        "有効なメールアドレスを入力してください"
      );
    });

    it("パスワードが空のとき password エラーが設定される", async () => {
      const { result } = renderHook(() => useLogin());

      await act(async () => {
        result.current.setEmail("user@example.com");
        result.current.setPassword("");
      });
      await act(async () => {
        await result.current.handleSubmit(fakeEvent());
      });

      expect(result.current.fieldErrors.password).toBe(
        "パスワードを入力してください"
      );
      expect(mockPost).not.toHaveBeenCalled();
    });

    it("入力が正しければバリデーションは通過して API が呼ばれる", async () => {
      mockPost.mockResolvedValue({
        data: { message: "ログインしました" },
        error: null,
        response: { status: 200 },
      });

      const { result } = renderHook(() => useLogin());

      await act(async () => {
        result.current.setEmail("user@example.com");
        result.current.setPassword("password");
      });
      await act(async () => {
        await result.current.handleSubmit(fakeEvent());
      });

      expect(result.current.fieldErrors).toEqual({});
      expect(mockPost).toHaveBeenCalledOnce();
    });
  });

  // API 成功
  describe("handleSubmit - 成功", () => {
    it("data が返ったときホームへリダイレクトする", async () => {
      mockPost.mockResolvedValue({
        data: { message: "ログインしました" },
        error: null,
        response: { status: 200 },
      });

      const { result } = renderHook(() => useLogin());

      await act(async () => {
        result.current.setEmail("user@example.com");
        result.current.setPassword("password");
      });
      await act(async () => {
        await result.current.handleSubmit(fakeEvent());
      });

      expect(mockReplace).toHaveBeenCalledWith("/", { replace: true });
      expect(mockFetchWatchlist).toHaveBeenCalledOnce();
    });
  });

  // API エラー
  describe("handleSubmit - エラー", () => {
    it("401 のとき認証失敗のエラーメッセージが設定される", async () => {
      mockPost.mockResolvedValue({
        data: null,
        error: null,
        response: { status: 401 },
      });

      const { result } = renderHook(() => useLogin());

      await act(async () => {
        result.current.setEmail("user@example.com");
        result.current.setPassword("wrong-password");
      });
      await act(async () => {
        await result.current.handleSubmit(fakeEvent());
      });

      expect(result.current.serverError).toBe(
        "メールアドレスまたはパスワードが正しくありません"
      );
    });

    it("400 のときサーバーメッセージが表示される", async () => {
      mockPost.mockResolvedValue({
        data: null,
        error: { error: "Bad request detail" },
        response: { status: 400 },
      });

      const { result } = renderHook(() => useLogin());

      await act(async () => {
        result.current.setEmail("user@example.com");
        result.current.setPassword("password");
      });
      await act(async () => {
        await result.current.handleSubmit(fakeEvent());
      });

      expect(result.current.serverError).toBe("Bad request detail");
    });

    it("429 のときレート制限エラーメッセージが設定される", async () => {
      mockPost.mockResolvedValue({
        data: null,
        error: null,
        response: { status: 429 },
      });

      const { result } = renderHook(() => useLogin());

      await act(async () => {
        result.current.setEmail("user@example.com");
        result.current.setPassword("password");
      });
      await act(async () => {
        await result.current.handleSubmit(fakeEvent());
      });

      expect(result.current.serverError).toBe(
        "しばらく時間をおいてから再度お試しください"
      );
    });

    it("503 のときサービス利用不可のエラーメッセージが設定される", async () => {
      mockPost.mockResolvedValue({
        data: null,
        error: null,
        response: { status: 503 },
      });

      const { result } = renderHook(() => useLogin());

      await act(async () => {
        result.current.setEmail("user@example.com");
        result.current.setPassword("password");
      });
      await act(async () => {
        await result.current.handleSubmit(fakeEvent());
      });

      expect(result.current.serverError).toBe(
        "サービスが一時的に利用できません。時間をおいて再度お試しください"
      );
    });

    it("予期しないステータスコードのとき汎用エラーメッセージが設定される", async () => {
      mockPost.mockResolvedValue({
        data: null,
        error: null,
        response: { status: 500 },
      });

      const { result } = renderHook(() => useLogin());

      await act(async () => {
        result.current.setEmail("user@example.com");
        result.current.setPassword("password");
      });
      await act(async () => {
        await result.current.handleSubmit(fakeEvent());
      });

      expect(result.current.serverError).toBe(
        "エラーが発生しました。時間をおいて再度お試しください"
      );
    });

    it("ネットワーク例外が発生したときネットワークエラーメッセージが設定される", async () => {
      mockPost.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useLogin());

      await act(async () => {
        result.current.setEmail("user@example.com");
        result.current.setPassword("password");
      });
      await act(async () => {
        await result.current.handleSubmit(fakeEvent());
      });

      expect(result.current.serverError).toBe("ネットワークエラーが発生しました");
    });
  });

  // OAuth コールバックエラー（?error=<code>）
  describe("OAuth エラー", () => {
    it("error=account_conflict のとき既存アカウント案内メッセージが初期表示される", () => {
      mockUseSearchParams.mockReturnValue(
        new URLSearchParams("error=account_conflict")
      );

      const { result } = renderHook(() => useLogin());

      expect(result.current.serverError).toBe(
        "このメールアドレスは既に登録されています。メールアドレスとパスワードでログインしてください"
      );
    });

    it.each([
      [
        "oauth_failed",
        "ソーシャルログインに失敗しました。時間をおいて再度お試しください",
      ],
      [
        "rate_limited",
        "試行回数が多すぎます。しばらく時間をおいて再度お試しください",
      ],
      [
        "service_unavailable",
        "サービスが一時的に利用できません。時間をおいて再度お試しください",
      ],
    ])("error=%s のとき対応するメッセージが初期表示される", (code, message) => {
      mockUseSearchParams.mockReturnValue(new URLSearchParams(`error=${code}`));

      const { result } = renderHook(() => useLogin());

      expect(result.current.serverError).toBe(message);
      expect(result.current.isLoading).toBe(false);
      expect(mockPost).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("未知のエラーコードのとき汎用のソーシャルログイン失敗メッセージが初期表示される", () => {
      mockUseSearchParams.mockReturnValue(
        new URLSearchParams("error=some_unknown_code")
      );

      const { result } = renderHook(() => useLogin());

      expect(result.current.serverError).toBe(
        "ソーシャルログインに失敗しました。時間をおいて再度お試しください"
      );
    });

    it("error パラメータがないとき serverError は null のまま", () => {
      const { result } = renderHook(() => useLogin());

      expect(result.current.serverError).toBeNull();
    });

    it.each(["account_conflict", "oauth_failed"])("%s の後もフォームからログインを再試行できる", async (code) => {
      mockUseSearchParams.mockReturnValue(
        new URLSearchParams(`error=${code}`)
      );
      mockPost.mockResolvedValue({
        data: null,
        error: null,
        response: { status: 401 },
      });

      const { result } = renderHook(() => useLogin());
      expect(result.current.serverError).not.toBeNull();

      await act(async () => {
        result.current.setEmail("user@example.com");
        result.current.setPassword("password");
      });
      await act(async () => {
        await result.current.handleSubmit(fakeEvent());
      });

      expect(result.current.serverError).toBe(
        "メールアドレスまたはパスワードが正しくありません"
      );
      expect(result.current.isLoading).toBe(false);
      expect(mockPost).toHaveBeenCalledWith("/v1/login", {
        body: { email: "user@example.com", password: "password" },
      });
    });
  });

  // ローディング状態
  describe("isLoading", () => {
    it("ログイン成功後は画面遷移完了まで isLoading を維持する", async () => {
      mockPost.mockResolvedValue({
        data: { message: "ログインしました" },
        error: null,
        response: { status: 200 },
      });

      const { result } = renderHook(() => useLogin());

      await act(async () => {
        result.current.setEmail("user@example.com");
        result.current.setPassword("password");
      });
      await act(async () => {
        await result.current.handleSubmit(fakeEvent());
      });

      expect(result.current.isLoading).toBe(true);
    });

    it("ログイン失敗後は isLoading が false に戻る", async () => {
      mockPost.mockResolvedValue({
        data: null,
        error: null,
        response: { status: 401 },
      });

      const { result } = renderHook(() => useLogin());

      await act(async () => {
        result.current.setEmail("user@example.com");
        result.current.setPassword("wrong-password");
      });
      await act(async () => {
        await result.current.handleSubmit(fakeEvent());
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});
