import type { Metadata } from "next";
import SignupForm from "@/components/auth/SignupForm";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export const metadata: Metadata = {
  title: "アカウント登録",
};

// CSP の nonce は proxy.ts でリクエストごとに生成されるため、動的レンダリングが必須
export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <AuthPageShell>
      <div className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] px-8 py-10">
        <h1 className="mb-6 text-2xl font-semibold text-[var(--color-text-primary)]">アカウント登録</h1>
        <SignupForm />
      </div>
    </AuthPageShell>
  );
}
