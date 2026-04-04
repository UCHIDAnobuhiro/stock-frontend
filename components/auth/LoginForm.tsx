"use client";

import Link from "next/link";
import { useLogin } from "@/hooks/useLogin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginForm() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    fieldErrors,
    serverError,
    handleSubmit,
  } = useLogin();

  return (
    <form onSubmit={handleSubmit} noValidate>
      {serverError && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-[var(--color-bear)] bg-[var(--color-bear-dim)] px-4 py-3 text-sm text-[var(--color-bear)]"
        >
          {serverError}
        </div>
      )}

      <div className="mb-4">
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]"
        >
          メールアドレス
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
          aria-invalid={!!fieldErrors.email}
        />
        {fieldErrors.email && (
          <p id="email-error" role="alert" className="mt-1 text-xs text-[var(--color-bear)]">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div className="mb-6">
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]"
        >
          パスワード
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby={fieldErrors.password ? "password-error" : undefined}
          aria-invalid={!!fieldErrors.password}
        />
        {fieldErrors.password && (
          <p id="password-error" role="alert" className="mt-1 text-xs text-[var(--color-bear)]">
            {fieldErrors.password}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" disabled={isLoading} className="w-full">
        {isLoading ? "ログイン中..." : "ログイン"}
      </Button>

      <p className="mt-4 text-center text-sm text-[var(--color-text-muted)]">
        アカウントをお持ちでない方は{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          新規登録
        </Link>
      </p>
    </form>
  );
}
