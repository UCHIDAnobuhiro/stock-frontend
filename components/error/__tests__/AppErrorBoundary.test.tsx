import { render, screen, fireEvent } from "@testing-library/react";
import { AppErrorBoundary } from "../AppErrorBoundary";

function CrashingChild({ shouldCrash }: { shouldCrash: boolean }) {
  if (shouldCrash) throw new Error("render failed");
  return <p>復旧しました</p>;
}

it("描画エラーから再試行で復旧できる", () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const { rerender } = render(<AppErrorBoundary><CrashingChild shouldCrash /></AppErrorBoundary>);
  expect(screen.getByText("エラーが発生しました")).toBeTruthy();
  rerender(<AppErrorBoundary><CrashingChild shouldCrash={false} /></AppErrorBoundary>);
  fireEvent.click(screen.getByRole("button", { name: "再試行" }));
  expect(screen.getByText("復旧しました")).toBeTruthy();
  log.mockRestore();
});
