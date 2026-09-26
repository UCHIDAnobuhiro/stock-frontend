import { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LogoSearchSheet } from "@/components/logo/LogoSearchSheet";

const { contentMounted } = vi.hoisted(() => ({ contentMounted: vi.fn() }));
vi.mock("@/components/logo/LogoSearchContent", async () => {
  const { useState } = await import("react");
  return {
    default: function MockLogoSearchContent() {
      const [count, setCount] = useState(0);
      contentMounted();
      return <button onClick={() => setCount((value) => value + 1)}>選択した画像 {count}</button>;
    },
  };
});

function Harness() {
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  return (
    <>
      <button onClick={() => { setOpen(true); setHasOpened(true); }}>ロゴ検索を開く</button>
      {hasOpened && <LogoSearchSheet open={open} onOpenChange={setOpen} />}
    </>
  );
}

beforeEach(() => {
  contentMounted.mockClear();
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
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("LogoSearchSheet", () => {
  it("初回オープンで内容を読み込み、閉じても画像状態とフォーカスを保持する", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "ロゴ検索を開く" });
    expect(contentMounted).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "ロゴから探す" })).toBeNull();

    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("status").textContent).toContain("ロゴ検索を読み込んでいます...");
    const dialog = await screen.findByRole("dialog", { name: "ロゴから探す" });
    expect(dialog.contains(document.activeElement)).toBe(true);
    const selectedImage = await within(dialog).findByRole("button", { name: "選択した画像 0" });
    await user.click(selectedImage);
    expect(within(dialog).getByRole("button", { name: "選択した画像 1" })).toBeTruthy();

    await user.click(within(dialog).getByRole("button", { name: "ロゴ検索を閉じる" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "ロゴから探す" })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(contentMounted).toHaveBeenCalled();

    await user.click(trigger);
    const reopened = await screen.findByRole("dialog", { name: "ロゴから探す" });
    expect(within(reopened).getByRole("button", { name: "選択した画像 1" })).toBeTruthy();
  });
});
