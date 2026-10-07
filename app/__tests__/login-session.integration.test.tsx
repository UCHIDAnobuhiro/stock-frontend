import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SWRConfig } from "swr";
import { AppRoutes } from "../routes";
import { useLogin } from "@/hooks/useLogin";

const { mockGet, mockPost } = vi.hoisted(() => ({ mockGet: vi.fn(), mockPost: vi.fn() }));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  default: { GET: mockGet, POST: mockPost },
}));
vi.mock("../page", () => ({ default: () => <div>ホーム画面</div> }));
vi.mock("../signup/page", () => ({ default: () => <div>登録画面</div> }));
vi.mock("../not-found", () => ({ default: () => <div>404画面</div> }));
vi.mock("../login/page", () => ({ default: () => <LoginProbe /> }));

function LoginProbe() {
  const { email, setEmail, password, setPassword, serverError, handleSubmit } = useLogin();
  return <form onSubmit={handleSubmit}>
    <label>メールアドレス<input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
    <label>パスワード<input value={password} onChange={(event) => setPassword(event.target.value)} /></label>
    <button type="submit">ログイン</button>
    {serverError && <p role="alert">{serverError}</p>}
  </form>;
}

it.each(["503", "network"])("ログイン成功後の認証確認%s障害は再試行で回復し、前ユーザーのcacheを消す", async (failure) => {
  const cache = new Map<string, unknown>();
  cache.set("/v1/symbols", { data: [{ code: "OLD" }] });
  mockGet.mockReset();
  mockPost.mockReset();
  let shouldRecover = false;
  mockGet.mockResolvedValueOnce({ error: { error: "unauthorized" }, response: new Response(null, { status: 401 }) });
  mockGet.mockImplementation(() => shouldRecover
    ? Promise.resolve({ data: [], response: new Response(null, { status: 200 }) })
    : failure === "network"
      ? Promise.reject(new TypeError("network failed"))
      : Promise.resolve({ error: { error: "unavailable" }, response: new Response(null, { status: 503 }) }));
  mockPost.mockResolvedValue({ data: { message: "ok" }, response: new Response(null, { status: 200 }) });

  render(<SWRConfig value={{ provider: () => cache, dedupingInterval: 0, shouldRetryOnError: false }}>
    <MemoryRouter initialEntries={["/login"]}><AppRoutes /></MemoryRouter>
  </SWRConfig>);
  await screen.findByRole("button", { name: "ログイン" });
  fireEvent.change(screen.getByLabelText("メールアドレス"), { target: { value: "user@example.com" } });
  fireEvent.change(screen.getByLabelText("パスワード"), { target: { value: "password" } });
  fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

  expect((await screen.findByRole("alert")).textContent).toContain("認証状態を確認できませんでした");
  expect(screen.queryByText("ネットワークエラーが発生しました")).toBeNull();
  expect((cache.get("/v1/symbols") as { data?: unknown } | undefined)?.data).toBeUndefined();
  shouldRecover = true;
  fireEvent.click(screen.getByRole("button", { name: "再試行" }));
  await waitFor(() => expect(screen.getByText("ホーム画面")).toBeTruthy());
  expect(mockPost).toHaveBeenCalledTimes(1);
  expect(mockGet.mock.calls.length).toBeGreaterThanOrEqual(3);
});
