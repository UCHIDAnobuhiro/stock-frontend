import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardLayout from "@/components/layout/DashboardLayout";

const { setSymbol, reorder, removeSymbol, useQuotes } = vi.hoisted(() => ({
  setSymbol: vi.fn(), reorder: vi.fn(), removeSymbol: vi.fn(),
  useQuotes: vi.fn(() => ({ quotes: new Map(), failures: new Map(), isLoading: false })),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("swr", () => ({ useSWRConfig: () => ({ mutate: vi.fn() }) }));
vi.mock("@/hooks/useSessionExpiry", () => ({ useSessionExpiry: () => ({ isExpired: false }) }));
vi.mock("@/hooks/useLogout", () => ({ useLogout: () => ({ handleLogout: vi.fn() }) }));
vi.mock("@/components/providers/NavigationLoadingProvider", () => ({
  useNavigationLoading: () => ({ startNavigation: vi.fn() }),
}));
vi.mock("@/components/layout/SessionExpiredDialog", () => ({ SessionExpiredDialog: () => null }));
vi.mock("@/components/logo/LogoSearchSheet", () => ({ LogoSearchSheet: () => null }));
vi.mock("@/components/ui/ThemeToggle", () => ({ ThemeToggle: () => <button>テーマ切り替え</button> }));
vi.mock("@/hooks/useSelectedSymbol", () => ({ useSelectedSymbol: () => ({ symbol: "AMZN", setSymbol }) }));
vi.mock("@/hooks/useWatchlist", () => ({
  useWatchlist: () => ({
    items: [{ symbol_code: "AMZN" }, { symbol_code: "ABT" }],
    isLoading: false, removeSymbol, reorder,
  }),
}));
vi.mock("@/hooks/useSymbols", () => ({
  useSymbols: () => ({ symbols: [{ code: "AMZN", name: "Amazon" }, { code: "ABT", name: "Abbott" }], isLoading: false }),
}));
vi.mock("@/hooks/useQuotes", () => ({ useQuotes }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("innerWidth", 390);
  // Base UIのpreventScroll対応検出を、スクロール機能のないjsdomでも再現する。
  const originalFocus = HTMLElement.prototype.focus;
  vi.spyOn(HTMLElement.prototype, "focus").mockImplementation(function (this: HTMLElement, options) {
    void options?.preventScroll;
    originalFocus.call(this, options);
  });
  vi.stubGlobal("ResizeObserver", class {
    observe() {} unobserve() {} disconnect() {}
  });
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockImplementation(function (this: HTMLElement) {
    return [this.getBoundingClientRect()] as unknown as DOMRectList;
  });
  vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(390);
  vi.spyOn(document.documentElement, "clientHeight", "get").mockReturnValue(844);
  // jsdomにはレイアウトがないため、実際のKeyboardSensorへ2行分の座標を与える。
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const code = this.querySelector(":scope > button[aria-label$='を表示']")?.getAttribute("aria-label");
    const top = code?.startsWith("ABT") ? 60 : 0;
    return { x: 0, y: top, top, left: 0, right: 256, bottom: top + 60, width: 256, height: 60, toJSON() {} };
  });
});

function resizeTo(width: number) {
  act(() => {
    vi.stubGlobal("innerWidth", width);
    window.dispatchEvent(new Event("resize"));
  });
}

describe("PCサイドバーの非表示時", () => {
  it("768px以上の開状態だけでパネルをマウントし、閉じた後に表示形式とスクロール位置を復元する", async () => {
    const user = userEvent.setup();
    resizeTo(767);
    render(<DashboardLayout><button>チャート操作</button></DashboardLayout>);
    expect(useQuotes).not.toHaveBeenCalled();

    resizeTo(768);
    expect(useQuotes).toHaveBeenCalledWith(["AMZN", "ABT"], { bars: 60 });
    const showSparklines = screen.getByRole("button", { name: "スパークラインを表示" });
    await user.click(showSparklines);
    expect(screen.getByRole("button", { name: "コンパクト表示に切り替え" })).toBeTruthy();
    const list = document.querySelector("#desktop-sidebar .overflow-y-auto") as HTMLDivElement;
    list.scrollTop = 72;
    fireEvent.scroll(list);

    await user.click(screen.getByRole("button", { name: "サイドバーを閉じる" }));
    expect(screen.queryByRole("button", { name: "コンパクト表示に切り替え" })).toBeNull();
    const callsWhileClosed = useQuotes.mock.calls.length;
    resizeTo(1279);
    resizeTo(1280);
    expect(useQuotes).toHaveBeenCalledTimes(callsWhileClosed);

    await user.click(screen.getByRole("button", { name: "サイドバーを開く" }));
    expect(screen.getByRole("button", { name: "コンパクト表示に切り替え" })).toBeTruthy();
    expect((document.querySelector("#desktop-sidebar .overflow-y-auto") as HTMLDivElement).scrollTop).toBe(72);
    expect(useQuotes).toHaveBeenLastCalledWith(["AMZN", "ABT"], { bars: 60 });

    resizeTo(767);
    expect(screen.queryByRole("button", { name: "コンパクト表示に切り替え" })).toBeNull();
    resizeTo(768);
    expect(screen.getByRole("button", { name: "コンパクト表示に切り替え" })).toBeTruthy();
  });

  it("スマホではSheetを開いた時だけウォッチリストをマウントする", async () => {
    const { user, trigger } = await openSidebar();
    expect(useQuotes).toHaveBeenCalledWith(["AMZN", "ABT"], { bars: 60 });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    const callsWhileClosed = useQuotes.mock.calls.length;
    resizeTo(767);
    expect(useQuotes).toHaveBeenCalledTimes(callsWhileClosed);
  });

  it("Sheetを開いたまま768px以上へ広げてもPC側は停止し、閉じるとメインへフォーカスする", async () => {
    const { user } = await openSidebar();
    await user.click(screen.getByRole("button", { name: "スパークラインを表示" }));
    resizeTo(768);
    expect(document.querySelector("#desktop-sidebar .overflow-y-auto")).toBeNull();
    expect(within(screen.getByRole("dialog", { name: "ウォッチリスト" })).getByRole("button", { name: "コンパクト表示に切り替え" })).toBeTruthy();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(screen.getByRole("main").contains(document.activeElement)).toBe(true));
    expect(document.querySelector("#desktop-sidebar .overflow-y-auto")).not.toBeNull();
    expect(screen.getByRole("button", { name: "コンパクト表示に切り替え" })).toBeTruthy();
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function openSidebar(triggerName = "銘柄サイドバーを開く") {
  const user = userEvent.setup();
  render(<DashboardLayout><button>チャート操作</button></DashboardLayout>);
  const trigger = screen.getByRole("button", { name: triggerName, exact: true });
  await user.click(trigger);
  const dialog = await screen.findByRole("dialog", { name: "ウォッチリスト" });
  await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  return { user, trigger, dialog };
}

describe("モバイルサイドバー", () => {
  it.each(["銘柄サイドバーを開く"])("%sから開くとフォーカスが循環し、Escapeで起点へ戻る", async (name) => {
    const { user, trigger, dialog } = await openSidebar(name);
    // 全操作要素を越えてTab/Shift+Tabしても背景へ移らない。
    for (const key of ["{Tab}", "{Shift>}{Tab}{/Shift}"]) {
      for (let i = 0; i < 12; i++) {
        await user.keyboard(key);
        await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
      }
    }
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("背景クリックで閉じて起点へ戻る", async () => {
    const { user, trigger } = await openSidebar();
    // Backdropはアクセシビリティツリーに含まれない。
    await user.click(document.querySelector('[data-slot="sheet-overlay"]')!);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it.each(["{Enter}", " "])("銘柄選択の%sで選択して閉じ、メインへフォーカスする", async (key) => {
    const { user, dialog } = await openSidebar();
    within(dialog).getByRole("button", { name: "ABT を表示" }).focus();
    await user.keyboard(key);
    expect(setSymbol).toHaveBeenCalledExactlyOnceWith("ABT");
    expect(removeSymbol).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(screen.getByRole("main").contains(document.activeElement)).toBe(true));
  });

  it.each(["{Enter}", " "])("削除の%sは銘柄を選択せず、サイドバーも閉じない", async (key) => {
    const { user, dialog } = await openSidebar();
    within(dialog).getByRole("button", { name: "ABT をウォッチリストから削除" }).focus();
    await user.keyboard(key);
    expect(removeSymbol).toHaveBeenCalledExactlyOnceWith("ABT");
    expect(setSymbol).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBe(dialog);
  });

  it.each([" ", "{Enter}"])("Spaceで並び替えを開始し、矢印で移動して%sで確定する", async (confirm) => {
    const { user, dialog } = await openSidebar();
    const handle = within(dialog).getAllByRole("button", { name: "並び替え" })[0];
    handle.focus();
    await user.keyboard(" ");
    await waitFor(() => expect(handle.getAttribute("aria-pressed")).toBe("true"));
    // KeyboardSensorは開始イベントを再処理しないよう次のtickでリスナーを登録する。
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    await user.keyboard("{ArrowDown}");
    await user.keyboard(confirm);
    await waitFor(() => expect(reorder).toHaveBeenCalledExactlyOnceWith(["ABT", "AMZN"]));
    expect(setSymbol).not.toHaveBeenCalled();
    expect(removeSymbol).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(document.activeElement).toBe(handle);
  });

  it("並び替え中のEscapeは取消だけを行い、次のEscapeでサイドバーを閉じる", async () => {
    const { user, trigger, dialog } = await openSidebar();
    const handle = within(dialog).getAllByRole("button", { name: "並び替え" })[0];
    handle.focus();
    await user.keyboard(" ");
    await waitFor(() => expect(handle.getAttribute("aria-pressed")).toBe("true"));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    await user.keyboard("{ArrowDown}{Escape}");
    await waitFor(() => expect(handle.getAttribute("aria-pressed")).not.toBe("true"));
    expect(reorder).not.toHaveBeenCalled();
    expect(setSymbol).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(document.activeElement).toBe(handle);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
