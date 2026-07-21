import { NextResponse, type NextRequest } from "next/server";
import { isTokenValid } from "@/lib/auth";

/**
 * 認可ルーティングガード + nonce ベース CSP の付与。
 * auth_token Cookie の存在と exp（期限）を検査し、
 * 未認証 × 保護ページ → /login、認証済み × /login,/signup → / にリダイレクトする。
 *
 * JWT の署名検証は行わない UX 目的のルーティング制御であり、真の認可は
 * バックエンド API が JWT 署名を検証して担う（proxy を通過しても API は 401 を返し得る）。
 *
 * exp が切れた Cookie を保持したままのユーザーが /login にすら到達できず
 * 再ログインできなくなる事態を防ぐため、期限切れの場合は未認証として扱う。
 *
 * CSP はリクエストごとに nonce を生成して script-src に埋め込むため、
 * この proxy が通るページはすべて動的レンダリングになる必要がある
 * （静的生成されたページには per-request の nonce を埋め込めないため）。
 */

const PUBLIC_PATHS = ["/login", "/signup"];

function buildCsp(nonce: string) {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://api.twelvedata.com https://logo.twelvedata.com",
    `connect-src 'self' ${process.env.NEXT_PUBLIC_API_BASE_URL ?? ""}`,
    "font-src 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth_token")?.value;
  const isAuthenticated = token !== undefined && isTokenValid(token);
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  if (!isAuthenticated && !isPublicPath) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }
  if (isAuthenticated && isPublicPath) {
    const response = NextResponse.redirect(new URL("/", request.url));
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\..*).*)"],
};
