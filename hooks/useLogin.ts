"use client";

import { useState, type SubmitEventHandler } from "react";
import { useRouter } from "next/navigation";
import apiClient, { TOKEN_KEY } from "@/lib/api";

interface FieldErrors {
  email?: string;
  password?: string;
}

/**
 * ログインフォームのロジックを管理するフック。
 * バリデーション・API 送信・エラー状態・リダイレクトを担う。
 */
export function useLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  /**
   * クライアントサイドのバリデーションを実行する。
   * エラーがあれば fieldErrors を更新して false を返す。
   */
  function validate(): boolean {
    const errors: FieldErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      errors.email = "メールアドレスを入力してください";
    } else if (!emailRegex.test(email)) {
      errors.email = "有効なメールアドレスを入力してください";
    }
    if (!password) {
      errors.password = "パスワードを入力してください";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  /**
   * フォーム送信ハンドラー。
   * バリデーション通過後に /v1/login を呼び出し、
   * 成功時は JWT をlocalStorage に保存してホームへリダイレクトする。
   * 失敗時はステータスコードに応じたエラーメッセージを設定する。
   */
  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setIsLoading(true);
    try {
      const { data, error, response } = await apiClient.POST("/v1/login", {
        body: { email, password },
      });

      if (data) {
        localStorage.setItem(TOKEN_KEY, data.token);
        router.replace("/");
        return;
      }

      switch (response.status) {
        case 400:
          setServerError(error?.error ?? "入力内容に問題があります");
          break;
        case 401:
          setServerError("メールアドレスまたはパスワードが正しくありません");
          break;
        case 429:
          setServerError("しばらく時間をおいてから再度お試しください");
          break;
        default:
          setServerError("エラーが発生しました。時間をおいて再度お試しください");
      }
    } catch {
      setServerError("ネットワークエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    fieldErrors,
    serverError,
    handleSubmit,
  };
}
