// @vitest-environment node
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

/** base64url エンコードされた JWT ペイロードを持つテスト用トークンを生成する */
function makeToken(payload: object): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake_signature`;
}

const nowSec = () => Math.floor(Date.now() / 1000);

function makeRequest(path: string, token?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (token !== undefined) {
    headers["cookie"] = `auth_token=${token}`;
  }
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

describe("proxy", () => {
  it("Cookie なしで / にアクセスすると /login へリダイレクトする", () => {
    const res = proxy(makeRequest("/"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("有効なトークンで / にアクセスすると素通しする", () => {
    const token = makeToken({ exp: nowSec() + 3600 });
    const res = proxy(makeRequest("/", token));
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("期限切れトークンで / にアクセスすると /login へリダイレクトする", () => {
    const token = makeToken({ exp: nowSec() - 1 });
    const res = proxy(makeRequest("/", token));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("不正フォーマットのトークンで / にアクセスすると /login へリダイレクトする", () => {
    const res = proxy(makeRequest("/", "invalid.token"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("有効なトークンで /login にアクセスすると / へリダイレクトする", () => {
    const token = makeToken({ exp: nowSec() + 3600 });
    const res = proxy(makeRequest("/login", token));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("有効なトークンで /signup にアクセスすると / へリダイレクトする", () => {
    const token = makeToken({ exp: nowSec() + 3600 });
    const res = proxy(makeRequest("/signup", token));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("Cookie なしで /login と /signup は素通しする", () => {
    const resLogin = proxy(makeRequest("/login"));
    expect(resLogin.headers.get("x-middleware-next")).toBe("1");

    const resSignup = proxy(makeRequest("/signup"));
    expect(resSignup.headers.get("x-middleware-next")).toBe("1");
  });

  it("期限切れトークンで /login にアクセスすると素通しする（再ログイン可能なことの回帰テスト）", () => {
    const token = makeToken({ exp: nowSec() - 1 });
    const res = proxy(makeRequest("/login", token));
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });
});
