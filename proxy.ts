import { NextResponse, type NextRequest } from "next/server";
import { isTokenValid } from "@/lib/auth";

/**
 * 認可ルーティングガード。
 * auth_token Cookie の存在と exp（期限）を検査し、
 * 未認証 × 保護ページ → /login、認証済み × /login,/signup → / にリダイレクトする。
 *
 * JWT の署名検証は行わない UX 目的のルーティング制御であり、真の認可は
 * バックエンド API が JWT 署名を検証して担う（proxy を通過しても API は 401 を返し得る）。
 *
 * exp が切れた Cookie を保持したままのユーザーが /login にすら到達できず
 * 再ログインできなくなる事態を防ぐため、期限切れの場合は未認証として扱う。
 */

const PUBLIC_PATHS = ["/login", "/signup"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth_token")?.value;
  const isAuthenticated = token !== undefined && isTokenValid(token);
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!isAuthenticated && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isAuthenticated && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\..*).*)"],
};
