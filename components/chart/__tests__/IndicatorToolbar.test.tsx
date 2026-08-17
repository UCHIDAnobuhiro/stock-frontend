import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IndicatorToolbar } from "@/components/chart/IndicatorToolbar";

describe("IndicatorToolbar", () => {
  it("SPではアイコン、PCではラベルを表示する", () => {
    render(
      <IndicatorToolbar
        smaEnabled
        toggleSma={vi.fn()}
        bollingerEnabled={false}
        toggleBollinger={vi.fn()}
      />,
    );

    const button = screen.getByRole("button", { name: "インジケーター" });
    const label = screen.getByText("インジケーター");
    const mobileIcon = button.querySelector(".lucide-sliders-horizontal");
    const desktopChevron = button.querySelector("svg:not(.lucide)");

    expect(label.classList.contains("hidden")).toBe(true);
    expect(label.classList.contains("sm:inline")).toBe(true);
    expect(mobileIcon?.classList.contains("sm:hidden")).toBe(true);
    expect(desktopChevron?.classList.contains("hidden")).toBe(true);
    expect(desktopChevron?.classList.contains("sm:block")).toBe(true);
    expect(screen.getByText("1")).toBeTruthy();
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
