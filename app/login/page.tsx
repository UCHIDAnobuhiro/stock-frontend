import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export const metadata: Metadata = {
  title: "ログイン",
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] px-8 py-10">
        <h1 className="mb-6 text-2xl font-semibold text-[var(--color-text-primary)]">ログイン</h1>
        <LoginForm />
      </div>
    </main>
  );
}
