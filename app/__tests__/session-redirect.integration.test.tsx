import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import useSWR, { SWRConfig } from "swr";
import { AppRoutes } from "../routes";
import { useLogout } from "@/hooks/useLogout";
import { useSessionRedirect } from "@/hooks/useSessionRedirect";
import { NavigationLoadingProvider } from "@/components/providers/NavigationLoadingProvider";

const { get, del } = vi.hoisted(() => ({ get: vi.fn(), del: vi.fn() }));
vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  default: { GET: get, DELETE: del },
}));
vi.mock("../page", () => ({ default: () => <HomeProbe /> }));
vi.mock("../login/page", () => ({ default: () => <div>ログイン画面</div> }));
vi.mock("../signup/page", () => ({ default: () => <div>登録画面</div> }));

let resolvePending: ((value: string) => void) | undefined;

function HomeProbe() {
  const { handleLogout } = useLogout();
  const redirectAfterExpiry = useSessionRedirect();
  useSWR("/v1/pending", () => new Promise<string>((resolve) => { resolvePending = resolve; }));
  return <>
    <button onClick={() => void handleLogout()}>ログアウト</button>
    <button onClick={() => void redirectAfterExpiry()}>セッション切れからログイン</button>
  </>;
}

it.each(["ログアウト", "セッション切れからログイン"])("%s直後の認証確認が再取得され、ログイン画面を操作できる", async (action) => {
  get.mockReset();
  del.mockReset();
  resolvePending = undefined;
  const cache = new Map<string, unknown>();
  cache.set("/v1/symbols", { data: [{ code: "OLD" }] });
  get.mockResolvedValueOnce({ data: [], response: { status: 200 } });
  get.mockResolvedValue({ error: { error: "unauthorized" }, response: { status: 401 } });
  del.mockResolvedValue({ response: { ok: true } });

  render(<SWRConfig value={{ provider: () => cache, shouldRetryOnError: false }}>
    <MemoryRouter>
      <NavigationLoadingProvider><AppRoutes /></NavigationLoadingProvider>
    </MemoryRouter>
  </SWRConfig>);

  await waitFor(() => expect(screen.queryByText("画面を読み込んでいます...")).toBeNull());
  expect(resolvePending).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: action }));

  await screen.findByText("ログイン画面");
  expect(get).toHaveBeenCalledTimes(2);
  await waitFor(() => expect(screen.getByText("ログイン画面").closest("[inert]")).toBeNull());
  expect(screen.queryByText("画面を読み込んでいます...")).toBeNull();
  expect((cache.get("/v1/symbols") as { data?: unknown } | undefined)?.data).toBeUndefined();
  if (action === "ログアウト") expect(del).toHaveBeenCalledWith("/v1/logout");
  else expect(del).not.toHaveBeenCalled();

  await act(async () => { resolvePending?.("STALE"); });
  expect((cache.get("/v1/pending") as { data?: unknown } | undefined)?.data).toBeUndefined();
});
