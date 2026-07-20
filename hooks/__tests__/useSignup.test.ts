import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSignup } from "@/hooks/useSignup";

// ---- モック設定 ----
// vi.mock はファイル先頭にホイストされるため、vi.hoisted で事前に変数を初期化する

const { mockReplace, mockPost } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("@/lib/api", () => ({
  default: { POST: mockPost },
}));

// ---- ヘルパー ----

const fakeEvent = () =>
  ({ preventDefault: vi.fn() }) as unknown as React.SubmitEvent<HTMLFormElement>;

// ---- テスト ----

describe("useSignup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // バリデーション
  describe("validate", () => {
    it("メールアドレスが空のとき email エラーが設定される", async () => {
      const { result } = renderHook(() => useSignup());

      await act(async () => {
        result.current.setEmail("");
        result.current.setPassword("password1234");
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
      const { result } = renderHook(() => useSignup());

      await act(async () => {
        result.current.setEmail("invalid-email");
        result.current.setPassword("password1234");
      });
      await act(async () => {
        await result.current.handleSubmit(fakeEvent());
      });

      expect(result.current.fieldErrors.email).toBe(
        "有効なメールアドレスを入力してください"
      );
    });

    it("パスワードが空のとき password エラーが設定される", async () => {
      const { result } = renderHook(() => useSignup());

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
    });

    it("パスワードが 12 文字未満のとき password エラーが設定される", async () => {
      const { result } = renderHook(() => useSignup());

      await act(async () => {
        result.current.setEmail("user@example.com");
        result.current.setPassword("short");
      });
      await act(async () => {
        await result.current.handleSubmit(fakeEvent());
      });

      expect(result.current.fieldErrors.password).toBe(
        "パスワードは12文字以上で入力してください"
      );
      expect(mockPost).not.toHaveBeenCalled();
    });

    it("パスワードがちょうど 12 文字のときバリデーションを通過して API が呼ばれる", async () => {
      mockPost.mockResolvedValue({
        data: null,
        error: null,
        response: { ok: true, status: 201 },
      });

      const { result } = renderHook(() => useSignup());

      await act(async () => {
        result.current.setEmail("user@example.com");
        result.current.setPassword("123456789012");
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
    it("response.ok のときログインページへリダイレクトする", async () => {
      mockPost.mockResolvedValue({
        data: null,
        error: null,
        response: { ok: true, status: 201 },
      });

      const { result } = renderHook(() => useSignup());

      await act(async () => {
        result.current.setEmail("user@example.com");
        result.current.setPassword("password1234");
      });
      await act(async () => {
        await result.current.handleSubmit(fakeEvent());
      });

      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  // API エラー
  describe("handleSubmit - エラー", () => {
    it("409 のときメールアドレス重複エラーメッセージが設定される", async () => {
      mockPost.mockResolvedValue({
        data: null,
        error: null,
        response: { ok: false, status: 409 },
      });

      const { result } = renderHook(() => useSignup());

      await act(async () => {
        result.current.setEmail("existing@example.com");
        result.current.setPassword("password1234");
      });
      await act(async () => {
        await result.current.handleSubmit(fakeEvent());
      });

      expect(result.current.serverError).toBe(
        "このメールアドレスはすでに登録されています"
      );
    });

    it("400 のときサーバーメッセージが表示される", async () => {
      mockPost.mockResolvedValue({
        data: null,
        error: { error: "Invalid input" },
        response: { ok: false, status: 400 },
      });

      const { result } = renderHook(() => useSignup());

      await act(async () => {
        result.current.setEmail("user@example.com");
        result.current.setPassword("password1234");
      });
      await act(async () => {
        await result.current.handleSubmit(fakeEvent());
      });

      expect(result.current.serverError).toBe("Invalid input");
    });

    it("429 のときレート制限エラーメッセージが設定される", async () => {
      mockPost.mockResolvedValue({
        data: null,
        error: null,
        response: { ok: false, status: 429 },
      });

      const { result } = renderHook(() => useSignup());

      await act(async () => {
        result.current.setEmail("user@example.com");
        result.current.setPassword("password1234");
      });
      await act(async () => {
        await result.current.handleSubmit(fakeEvent());
      });

      expect(result.current.serverError).toBe(
        "しばらく時間をおいてから再度お試しください"
      );
    });

    it("予期しないステータスコードのとき汎用エラーメッセージが設定される", async () => {
      mockPost.mockResolvedValue({
        data: null,
        error: null,
        response: { ok: false, status: 500 },
      });

      const { result } = renderHook(() => useSignup());

      await act(async () => {
        result.current.setEmail("user@example.com");
        result.current.setPassword("password1234");
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

      const { result } = renderHook(() => useSignup());

      await act(async () => {
        result.current.setEmail("user@example.com");
        result.current.setPassword("password1234");
      });
      await act(async () => {
        await result.current.handleSubmit(fakeEvent());
      });

      expect(result.current.serverError).toBe("ネットワークエラーが発生しました");
    });
  });
});
