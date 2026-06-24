"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api";

interface FieldErrors {
  email?: string;
  password?: string;
}

/**
 * 新規登録フォームのロジックを管理するフック。
 * バリデーション・API 送信・エラー状態・リダイレクトを担う。
 */
export function useSignup() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  /**
   * クライアントサイドのバリデーションを実行する。
   * useLogin より厳しく、パスワードは 12 文字以上を要求する。
   */
  function validate(): boolean {
    const errors: FieldErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = "メールアドレスを入力してください";
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.email = "有効なメールアドレスを入力してください";
    }
    if (!password) {
      errors.password = "パスワードを入力してください";
    } else if (password.length < 12) {
      errors.password = "パスワードは12文字以上で入力してください";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  /**
   * フォーム送信ハンドラー。
   * バリデーション通過後に /v1/signup を呼び出し、
   * 成功時はログインページへリダイレクトする。
   * 409 はメールアドレス重複、その他はステータスコードに応じたエラーを表示する。
   */
  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setIsLoading(true);
    try {
      const { error, response } = await apiClient.POST("/v1/signup", {
        body: { email: email.trim(), password },
      });

      if (response.ok) {
        router.replace("/login");
        return;
      }

      switch (response.status) {
        case 400:
          setServerError(error?.error ?? "入力内容に問題があります");
          break;
        case 409:
          setServerError("このメールアドレスはすでに登録されています");
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
