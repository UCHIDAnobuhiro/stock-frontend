import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SWRConfig, useSWRConfig } from "swr";
import { AppRoutes } from "../routes";
import { ApiError } from "@/lib/api";
import { fetchWatchlist } from "@/hooks/useWatchlist";

vi.mock("@/hooks/useWatchlist", () => ({ fetchWatchlist: vi.fn() }));
const { homeLifecycle } = vi.hoisted(() => ({ homeLifecycle: { mounts: 0, unmounts: 0 } }));
vi.mock("../page", async () => {
  const React = await import("react");
  return { default: function MockHome() {
    const [count, setCount] = React.useState(0);
    React.useEffect(() => {
      homeLifecycle.mounts++;
      return () => { homeLifecycle.unmounts++; };
    }, []);
    return <div>ホーム画面 <button onClick={() => setCount(count + 1)}>操作 {count}</button></div>;
  } };
});
vi.mock("../login/page", () => ({ default: () => <div>ログイン画面</div> }));
vi.mock("../signup/page", () => ({ default: () => <div>登録画面</div> }));
vi.mock("../not-found", () => ({ default: () => <div>404画面</div> }));

let revalidateWatchlist: (() => Promise<unknown>) | undefined;

function CaptureRevalidate() {
  const { mutate } = useSWRConfig();
  revalidateWatchlist = () => mutate("/v1/watchlist");
  return null;
}

function renderRoute(path: string) {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
      <CaptureRevalidate />
      <MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>
    </SWRConfig>,
  );
}

it("未認証のホームアクセスをログインへ移し、APIの401を根拠に判定する", async () => {
  vi.mocked(fetchWatchlist).mockRejectedValueOnce(new ApiError(401, "未認証"));
  renderRoute("/");
  expect(await screen.findByText("ログイン画面")).toBeTruthy();
});

it("認証済みの公開画面アクセスをホームへ移す", async () => {
  vi.mocked(fetchWatchlist).mockResolvedValueOnce([]);
  renderRoute("/login");
  expect(await screen.findByText("ホーム画面")).toBeTruthy();
});

it("未認証の未知URLもログインへ移す", async () => {
  vi.mocked(fetchWatchlist).mockRejectedValueOnce(new ApiError(401, "未認証"));
  renderRoute("/unknown");
  expect(await screen.findByText("ログイン画面")).toBeTruthy();
});

it("一時障害ではログインへ移さず再試行を表示する", async () => {
  vi.mocked(fetchWatchlist).mockRejectedValueOnce(new ApiError(503, "一時障害"));
  renderRoute("/");
  expect((await screen.findByRole("alert")).textContent).toContain("認証状態を確認できませんでした");
  expect(screen.queryByText("ログイン画面")).toBeNull();
});

it("認証成功後の再検証が一時障害でもホームをアンマウントしない", async () => {
  vi.mocked(fetchWatchlist)
    .mockResolvedValueOnce([])
    .mockRejectedValueOnce(new ApiError(503, "一時障害"));
  renderRoute("/");
  await waitFor(() => expect(screen.queryByText("画面を読み込んでいます...")).toBeNull());
  fireEvent.click(screen.getByRole("button", { name: "操作 0" }));
  const mounts = homeLifecycle.mounts;
  const unmounts = homeLifecycle.unmounts;

  await act(async () => {
    await revalidateWatchlist!().catch(() => undefined);
  });

  expect(fetchWatchlist).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("button", { name: "操作 1" })).toBeTruthy();
  expect(homeLifecycle.mounts).toBe(mounts);
  expect(homeLifecycle.unmounts).toBe(unmounts);
  expect(screen.queryByText("認証状態を確認できませんでした。通信を確認して再試行してください。")).toBeNull();
});

it("初回認証確認中もホームをマウントしてデータ取得を並列に開始する", async () => {
  let resolveCheck!: (items: []) => void;
  vi.mocked(fetchWatchlist).mockReturnValueOnce(new Promise((resolve) => { resolveCheck = resolve; }));
  renderRoute("/?symbol=AAPL");
  expect(screen.getByText("ホーム画面")).toBeTruthy();
  expect(screen.getByText("画面を読み込んでいます...")).toBeTruthy();
  resolveCheck([]);
  await waitFor(() => expect(screen.queryByText("画面を読み込んでいます...")).toBeNull());
});
