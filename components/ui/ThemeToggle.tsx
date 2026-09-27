"use client";

import { useTheme } from "@/components/providers/ThemeProvider";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="sm"
      className="size-11 rounded-full"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="テーマ切り替え"
      aria-pressed={isDark}
    >
      {isDark ? (
        <Sun className="h-3.5 w-3.5" />
      ) : (
        <Moon className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}
