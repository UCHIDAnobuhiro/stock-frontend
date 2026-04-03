import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "ログイン",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-8 py-10 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold text-[#0f172a]">ログイン</h1>
        <LoginForm />
      </div>
    </main>
  );
}
