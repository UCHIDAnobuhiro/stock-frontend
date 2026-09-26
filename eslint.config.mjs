import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const sourceFiles = ["app/**/*.{js,jsx,ts,tsx}", "components/**/*.{js,jsx,ts,tsx}", "hooks/**/*.{js,jsx,ts,tsx}", "lib/**/*.{js,jsx,ts,tsx}"];
const testFiles = ["**/__tests__/**", "**/*.{test,spec}.{js,jsx,ts,tsx}"];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
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
          { target: ["./hooks", "./components"], from: "./lib/api.server.ts", message: "サーバー専用 API は app/ からのみ参照してください。" },
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
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".claude/**",
  ]),
]);

export default eslintConfig;
