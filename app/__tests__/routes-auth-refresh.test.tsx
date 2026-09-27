import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SWRConfig } from "swr";
import { SESSION_EXPIRED_EVENT } from "@/lib/api";
import { AppRoutes } from "../routes";

const { transport } = vi.hoisted(() => {
  const transport = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", transport);
  return { transport };
});

vi.mock("../page", () => ({ default: () => <div>ホーム画面</div> }));

afterAll(() => vi.unstubAllGlobals());

function jsonResponse(status: number, body: object): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderRoute(path: string) {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
      <MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>
    </SWRConfig>,
  );
}

function requestPath(input: Request | URL | string): string {
  return new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url).pathname;
}

it.each([
  ["/login", 429, "/v1/login", "ログイン"],
  ["/login", 503, "/v1/login", "ログイン"],
  ["/signup", 429, "/v1/signup", "アカウント登録"],
  ["/signup", 503, "/v1/signup", "アカウント登録"],
] as const)("公開ページ %s は refresh %i 障害中も認証手段を使える", async (path, refreshStatus, submitPath, submitLabel) => {
  transport.mockReset();
  const onSessionExpired = vi.fn();
  window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  transport.mockImplementation(async (input) => {
    const pathname = requestPath(input);
    if (pathname === "/v1/watchlist") return jsonResponse(401, { error: "unauthorized" });
    if (pathname === "/v1/auth/refresh") return jsonResponse(refreshStatus, { error: "unavailable" });
    if (pathname === submitPath) return jsonResponse(200, { message: "ok" });
    throw new Error(`Unexpected request: ${pathname}`);
  });

  try {
    renderRoute(path);
    await waitFor(() => expect(transport).toHaveBeenCalledTimes(2));
    const email = await screen.findByLabelText("メールアドレス");
    const password = screen.getByLabelText("パスワード");
    const submit = screen.getByRole("button", { name: submitLabel });
    const google = screen.getByRole("link", { name: "Googleで続ける" });
    const github = screen.getByRole("link", { name: "GitHubで続ける" });
    expect(google.getAttribute("href")).toContain("/v1/auth/oauth/google");
    expect(github.getAttribute("href")).toContain("/v1/auth/oauth/github");
    expect(google.getAttribute("aria-disabled")).toBe("false");
    expect(github.getAttribute("aria-disabled")).toBe("false");
    expect(email.closest("[inert]")).toBeNull();
    expect(screen.queryByRole("button", { name: "再試行" })).toBeNull();
    expect(screen.queryByText("画面を読み込んでいます...")).toBeNull();
    expect(onSessionExpired).not.toHaveBeenCalled();

    google.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(google);
    expect(google.getAttribute("aria-disabled")).toBe("true");
    fireEvent(window, new Event("pageshow"));
    expect(github.getAttribute("aria-disabled")).toBe("false");
    github.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(github);
    expect(github.getAttribute("aria-disabled")).toBe("true");

    fireEvent.change(email, { target: { value: "user@example.com" } });
    fireEvent.change(password, { target: { value: "password123456" } });
    fireEvent.click(submit);
    await waitFor(() => expect(transport.mock.calls.some(([input]) => requestPath(input) === submitPath)).toBe(true));
    if (path === "/login") {
      expect((await screen.findByRole("alert")).textContent).toContain("認証状態を確認できませんでした");
    } else {
      expect(await screen.findByRole("heading", { name: "ログイン" })).toBeTruthy();
    }
    expect(onSessionExpired).not.toHaveBeenCalled();
  } finally {
    window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }
});

it("保護ページは refresh の一時障害を再試行で回復できる", async () => {
  transport.mockReset();
  let recovered = false;
  const onSessionExpired = vi.fn();
  window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  transport.mockImplementation(async (input) => {
    const pathname = requestPath(input);
    if (pathname === "/v1/watchlist") {
      return recovered ? jsonResponse(200, []) : jsonResponse(401, { error: "unauthorized" });
    }
    if (pathname === "/v1/auth/refresh") return jsonResponse(503, { error: "unavailable" });
    throw new Error(`Unexpected request: ${pathname}`);
  });
  try {
    renderRoute("/");
    expect((await screen.findByRole("alert")).textContent).toContain("認証状態を確認できませんでした");
    expect(onSessionExpired).not.toHaveBeenCalled();
    recovered = true;
    fireEvent.click(screen.getByRole("button", { name: "再試行" }));
    expect(await screen.findByText("ホーム画面")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("button", { name: "再試行" })).toBeNull());
    expect(onSessionExpired).not.toHaveBeenCalled();
  } finally {
    window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }
});

it.each(["/login", "/signup"])("認証済みの %s はホームへ移る", async (path) => {
  transport.mockReset();
  transport.mockImplementation(async (input) => {
    const pathname = requestPath(input);
    if (pathname === "/v1/watchlist") return jsonResponse(200, []);
    throw new Error(`Unexpected request: ${pathname}`);
  });
  renderRoute(path);
  expect(await screen.findByText("ホーム画面")).toBeTruthy();
  expect(screen.queryByLabelText("メールアドレス")).toBeNull();
});
