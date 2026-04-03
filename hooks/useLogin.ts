"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import apiClient, { TOKEN_KEY } from "@/lib/api";

interface FieldErrors {
  email?: string;
  password?: string;
}

export function useLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
