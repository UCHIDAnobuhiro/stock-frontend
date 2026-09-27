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

it("描画エラー後に明示操作でのみページを再読み込みする", () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const reloadPage = vi.fn();
  render(<AppErrorBoundary reloadPage={reloadPage}><CrashingChild shouldCrash /></AppErrorBoundary>);
  expect(reloadPage).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "ページ再読み込み" }));
  expect(reloadPage).toHaveBeenCalledOnce();
  log.mockRestore();
});
