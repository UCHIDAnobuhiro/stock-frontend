import { describe, it, expect } from "vitest";
import { isTokenValid } from "@/lib/auth";

/** base64url エンコードされた JWT ペイロードを持つテスト用トークンを生成する */
function makeToken(payload: object): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake_signature`;
}

const nowSec = () => Math.floor(Date.now() / 1000);

describe("isTokenValid", () => {
  it("有効期限内のトークンは true を返す", () => {
    const token = makeToken({ exp: nowSec() + 3600 });
    expect(isTokenValid(token)).toBe(true);
  });

  it("有効期限切れのトークンは false を返す", () => {
    const token = makeToken({ exp: nowSec() - 1 });
    expect(isTokenValid(token)).toBe(false);
  });

  it("exp クレームがないトークンは false を返す", () => {
    const token = makeToken({ sub: "user123" });
    expect(isTokenValid(token)).toBe(false);
  });

  it("exp が数値でない場合は false を返す", () => {
    const token = makeToken({ exp: "not-a-number" });
    expect(isTokenValid(token)).toBe(false);
  });

  it("セグメントが 3 つない不正トークンは false を返す", () => {
    expect(isTokenValid("invalid.token")).toBe(false);
  });

  it("空文字列は false を返す", () => {
    expect(isTokenValid("")).toBe(false);
  });

  it("ペイロードが有効な JSON でない場合は false を返す", () => {
    const token = `header.${btoa("not-json")}.sig`;
    expect(isTokenValid(token)).toBe(false);
  });
});
