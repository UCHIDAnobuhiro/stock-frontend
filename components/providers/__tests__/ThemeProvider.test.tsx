// @vitest-environment node
//
// next-themes は inline script の nonce をサーバー描画時のみ出力する
// （実装は `nonce: typeof window === "undefined" ? nonce : ""`）。
// jsdom 環境では window が存在するため常に空文字になり検証できないので、
// このファイルだけ node 環境で SSR 描画して検証する。
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

/**
 * next-themes は描画前にテーマを適用する inline script を挿入する。
 * proxy.ts の CSP（script-src に nonce + strict-dynamic）下では
 * nonce のない inline script がブロックされ、ハイドレーションまで
 * ライトテーマで描画される＝白フラッシュが起きる。
 */
describe("ThemeProvider", () => {
  it("nonce を渡すと inline script に nonce 属性が付く", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider nonce="test-nonce-value">
        <div>child</div>
      </ThemeProvider>,
    );

    expect(html).toContain('<script nonce="test-nonce-value">');
  });

  it("nonce を渡さない場合は nonce 属性が出力されない", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <div>child</div>
      </ThemeProvider>,
    );

    expect(html).toContain("<script>");
    expect(html).not.toContain("nonce");
  });

  it("children を描画する", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider nonce="test-nonce-value">
        <div>child</div>
      </ThemeProvider>,
    );

    expect(html).toContain("<div>child</div>");
  });
});
