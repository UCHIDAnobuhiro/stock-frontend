import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IndicatorToolbar } from "@/components/chart/IndicatorToolbar";

describe("IndicatorToolbar", () => {
  it("有効な指標の件数を表示し、チェックボックスで切り替えられる", () => {
    const toggleSma = vi.fn();
    render(<IndicatorToolbar smaEnabled toggleSma={toggleSma} bollingerEnabled={false} toggleBollinger={vi.fn()} />);
    expect(screen.getByText("1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "インジケーター" }));
    const checkbox = screen.getByRole("checkbox", { name: "移動平均線（SMA）" }) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    expect(toggleSma).toHaveBeenCalledOnce();
  });

  it("ボタンからメニューを開閉できる", () => {
    render(
      <IndicatorToolbar
        smaEnabled={false}
        toggleSma={vi.fn()}
        bollingerEnabled={false}
        toggleBollinger={vi.fn()}
      />,
    );

    const button = screen.getByRole("button", { name: "インジケーター" });
    expect(button.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(button);

    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("テクニカル指標")).toBeTruthy();
  });
});
