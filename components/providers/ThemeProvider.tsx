import { useEffect, useSyncExternalStore } from "react";

type Theme = "dark" | "light";
const subscribers = new Set<() => void>();

function emitThemeChange() {
  for (const listener of subscribers) listener();
}

function subscribe(listener: () => void) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

function getTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== "theme") return;
      document.documentElement.classList.toggle("dark", event.newValue !== "light");
      emitThemeChange();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return children;
}

export function useTheme() {
  const resolvedTheme = useSyncExternalStore(subscribe, getTheme, () => "dark" as Theme);
  const setTheme = (theme: Theme) => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // Storageが使えない環境でも現在の画面では切り替える。
    }
    emitThemeChange();
  };
  return { resolvedTheme, setTheme };
}
