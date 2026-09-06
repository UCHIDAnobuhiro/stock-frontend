import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardLayout from "@/components/layout/DashboardLayout";

const { setSymbol, reorder, removeSymbol } = vi.hoisted(() => ({
  setSymbol: vi.fn(), reorder: vi.fn(), removeSymbol: vi.fn(),
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
vi.mock("@/hooks/useQuotes", () => ({
  useQuotes: () => ({ quotes: new Map(), failures: new Map(), isLoading: false }),
}));

beforeEach(() => {
  vi.clearAllMocks();
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

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function openSidebar(triggerName = "銘柄サイドバーを開く") {
  const user = userEvent.setup();
  render(<DashboardLayout><button>チャート操作</button></DashboardLayout>);
  const trigger = screen.getByRole("button", { name: triggerName, exact: true });
  await user.click(trigger);
  const dialog = await screen.findByRole("dialog", { name: "銘柄" });
  await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  return { user, trigger, dialog };
}

describe("モバイルサイドバー", () => {
  it.each(["銘柄サイドバーを開く", "銘柄"])("%sから開くとフォーカスが循環し、Escapeで起点へ戻る", async (name) => {
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
