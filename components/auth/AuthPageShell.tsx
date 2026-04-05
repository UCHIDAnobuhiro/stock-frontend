"use client";

import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      {children}
    </main>
  );
}
