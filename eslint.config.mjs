import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import importPlugin from "eslint-plugin-import";

const sourceFiles = ["app/**/*.{js,jsx,ts,tsx}", "components/**/*.{js,jsx,ts,tsx}", "hooks/**/*.{js,jsx,ts,tsx}", "lib/**/*.{js,jsx,ts,tsx}"];
const testFiles = ["**/__tests__/**", "**/*.{test,spec}.{js,jsx,ts,tsx}"];

export default defineConfig([
  globalIgnores(["dist/**", "node_modules/**", ".claude/**"]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { console: "readonly", document: "readonly", localStorage: "readonly" },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, import: importPlugin },
    settings: { "import/resolver": {
      node: { extensions: [".ts", ".tsx", ".js", ".jsx"] },
      alias: { map: [["@", "."]], extensions: [".ts", ".tsx", ".js", ".jsx"] },
    } },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: sourceFiles,
    ignores: testFiles,
    rules: {
      "import/no-restricted-paths": ["error", {
        basePath: ".",
        zones: [
          { target: "./lib", from: ["./app", "./components", "./hooks"], message: "lib/ から上位層を参照しないでください。" },
          { target: "./hooks", from: ["./app", "./components"], message: "hooks/ から表示層を参照しないでください。" },
          { target: "./components", from: "./app", message: "components/ から app/ を参照しないでください。" },
        ],
      }],
    },
  },
  {
    files: ["components/**/*.{js,jsx,ts,tsx}"],
    ignores: testFiles,
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          regex: "(^@/lib/api(\\.[cm]?[jt]sx?)?$|(^|/)lib/api(\\.[cm]?[jt]sx?)?$)",
          allowImportNames: ["ApiError"],
          message: "API 通信は hooks/ を経由してください（ApiError の表示上の参照を除く）。",
        }],
      }],
      "no-restricted-syntax": ["error", {
        selector: "ImportExpression[source.value=/lib\\/api(\\.[cm]?[jt]sx?)?$/]",
        message: "API クライアントの動的 import も hooks/ を経由してください。",
      }],
    },
  },
]);
