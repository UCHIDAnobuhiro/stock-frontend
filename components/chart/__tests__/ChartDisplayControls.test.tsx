import { startTransition } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Interval } from "@/hooks/useSelectedSymbol";
import { ChartIntervalControls } from "../ChartDisplayControls";

const setInterval = vi.fn();
let interval: Interval = "1day";
vi.mock("@/hooks/useSelectedSymbol", () => ({
  useSelectedSymbol: () => ({ interval, setInterval }),
}));

function setup(isPending = false) {
  render(<ChartIntervalControls isPending={isPending} compact />);
  const control = screen.getByRole("group", { name: "時間足" });
  control.setPointerCapture = vi.fn();
  vi.spyOn(control, "getBoundingClientRect").mockReturnValue({ left: 0, width: 188 } as DOMRect);
  return control;
}

function pointer(control: HTMLElement, type: string, clientX: number) {
  const event = new MouseEvent(type, { bubbles: true, clientX, button: 0 });
  Object.defineProperties(event, {
    pointerId: { value: 1 },
    isPrimary: { value: true },
  });
  fireEvent(control, event);
}

beforeEach(() => {
  setInterval.mockReset();
  interval = "1day";
});

describe("ChartIntervalControls", () => {
  it("タップを確定し、後続のclickで二重に遷移しない", () => {
    const control = setup();
    pointer(control, "pointerdown", 94);
    pointer(control, "pointerup", 94);
    fireEvent.click(screen.getByRole("button", { name: "週足" }), { detail: 1 });
    expect(setInterval).toHaveBeenCalledExactlyOnceWith("1week");
  });

  it("ドラッグ中は遷移せず、離した位置で一度だけ確定する", () => {
    const control = setup();
    pointer(control, "pointerdown", 34);
    pointer(control, "pointermove", 94);
    pointer(control, "pointermove", 154);
    expect(setInterval).not.toHaveBeenCalled();
    pointer(control, "pointerup", 154);
    expect(setInterval).toHaveBeenCalledExactlyOnceWith("1month");
  });

  it.each([true, false])("遷移中は離した月足を維持し、完了後は実際のURLに従う（成功: %s）", async (commits) => {
    let finish!: () => void;
    const navigation = new Promise<void>(resolve => { finish = resolve; });
    setInterval.mockImplementation(() => {
      startTransition(async () => { await navigation; });
    });
    const { rerender } = render(<ChartIntervalControls isPending={false} compact />);
    const control = screen.getByRole("group", { name: "時間足" });
    control.setPointerCapture = vi.fn();
    vi.spyOn(control, "getBoundingClientRect").mockReturnValue({ left: 0, width: 188 } as DOMRect);
    pointer(control, "pointerdown", 34);
    pointer(control, "pointermove", 154);
    pointer(control, "pointerup", 154);
    pointer(control, "lostpointercapture", 154);
    expect(control.style.getPropertyValue("--interval-position")).toBe("2");
    expect(control.getAttribute("data-dragging")).toBe("false");
    expect(screen.getByRole("button", { name: "月足" }).getAttribute("aria-pressed")).toBe("true");
    rerender(<ChartIntervalControls isPending compact />);
    expect(control.style.getPropertyValue("--interval-position")).toBe("2");
    await act(async () => {
      if (commits) interval = "1month";
      finish();
    });
    rerender(<ChartIntervalControls isPending={false} compact />);
    expect(control.style.getPropertyValue("--interval-position")).toBe(commits ? "2" : "0");
  });

  it("スクロールなどでキャンセルされたドラッグは確定しない", () => {
    const control = setup();
    pointer(control, "pointerdown", 34);
    pointer(control, "pointermove", 154);
    pointer(control, "pointercancel", 154);
    pointer(control, "pointerup", 154);
    expect(setInterval).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "日足" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("キーボードで選択できる", async () => {
    setup();
    const user = userEvent.setup();
    screen.getByRole("button", { name: "週足" }).focus();
    await user.keyboard("{Enter}");
    expect(setInterval).toHaveBeenCalledExactlyOnceWith("1week");
  });

  it("同じ時間足の選択では遷移しない", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "日足" }));
    expect(setInterval).not.toHaveBeenCalled();
  });

  it("読み込み中は遷移しない", () => {
    const control = setup(true);
    pointer(control, "pointerdown", 154);
    pointer(control, "pointerup", 154);
    fireEvent.click(screen.getByRole("button", { name: "月足" }));
    expect(setInterval).not.toHaveBeenCalled();
  });
});
