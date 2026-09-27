import LoginForm from "@/components/auth/LoginForm";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export default function LoginPage() {
  return (
    <AuthPageShell>
      <div className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] px-8 py-10">
        <h1 className="mb-6 text-2xl font-semibold text-[var(--color-text-primary)]">ログイン</h1>
        <LoginForm />
      </div>
    </AuthPageShell>
  );
}
