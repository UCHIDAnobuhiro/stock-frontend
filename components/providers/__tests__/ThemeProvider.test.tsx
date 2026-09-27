import { readFileSync } from "node:fs";
import { act, renderHook } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../ThemeProvider";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

it("静的初期化スクリプトは保存値なしでダークテーマを描画前に設定する", () => {
  new Function(readFileSync("public/theme-init.js", "utf8"))();
  expect(document.documentElement.classList.contains("dark")).toBe(true);
});

it("テーマ変更をDOMと保存値へ反映し、他タブの変更にも追従する", () => {
  document.documentElement.classList.add("dark");
  const { result } = renderHook(() => useTheme(), {
    wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
  });
  expect(result.current.resolvedTheme).toBe("dark");
  act(() => result.current.setTheme("light"));
  expect(result.current.resolvedTheme).toBe("light");
  expect(localStorage.getItem("theme")).toBe("light");
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: "theme", newValue: "dark" })));
  expect(result.current.resolvedTheme).toBe("dark");
});
