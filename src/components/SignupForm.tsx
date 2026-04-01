"use client";

import Link from "next/link";
import { useSignup } from "@/src/hooks/useSignup";

export default function SignupForm() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    fieldErrors,
    serverError,
    handleSubmit,
  } = useSignup();

  return (
    <form onSubmit={handleSubmit} noValidate>
      {serverError && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#dc2626]"
        >
          {serverError}
        </div>
      )}

      <div className="mb-4">
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-[#0f172a]"
        >
          メールアドレス
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
          aria-invalid={!!fieldErrors.email}
          className={`w-full rounded-lg border px-3 py-2 text-sm text-[#0f172a] outline-none transition-colors focus:ring-1 ${
            fieldErrors.email
              ? "border-[#dc2626] focus:border-[#dc2626] focus:ring-[#dc2626]"
              : "border-slate-300 focus:border-[#16a34a] focus:ring-[#16a34a]"
          }`}
        />
        {fieldErrors.email && (
          <p id="email-error" role="alert" className="mt-1 text-xs text-[#dc2626]">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div className="mb-6">
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-medium text-[#0f172a]"
        >
          パスワード
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby={fieldErrors.password ? "password-error" : undefined}
          aria-invalid={!!fieldErrors.password}
          className={`w-full rounded-lg border px-3 py-2 text-sm text-[#0f172a] outline-none transition-colors focus:ring-1 ${
            fieldErrors.password
              ? "border-[#dc2626] focus:border-[#dc2626] focus:ring-[#dc2626]"
              : "border-slate-300 focus:border-[#16a34a] focus:ring-[#16a34a]"
          }`}
        />
        {fieldErrors.password && (
          <p id="password-error" role="alert" className="mt-1 text-xs text-[#dc2626]">
            {fieldErrors.password}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-[#16a34a] py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "登録中..." : "アカウント登録"}
      </button>

      <p className="mt-4 text-center text-sm text-slate-500">
        すでにアカウントをお持ちの方は{" "}
        <Link href="/login" className="font-medium text-[#16a34a] hover:underline">
          ログイン
        </Link>
      </p>
    </form>
  );
}
