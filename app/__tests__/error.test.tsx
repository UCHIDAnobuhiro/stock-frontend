import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ErrorPage from "@/app/error"

describe("Error", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("タイトルと説明文が表示される", () => {
    const error = new Error("boom")
    render(<ErrorPage error={error} reset={vi.fn()} />)

    expect(
      screen.getByRole("heading", { name: "エラーが発生しました" })
    ).not.toBeNull()
    expect(
      screen.getByText(
        "ページの表示中に問題が発生しました。時間をおいて再度お試しください。"
      )
    ).not.toBeNull()
  })

  it("再試行ボタンをクリックすると reset が呼ばれる", async () => {
    const user = userEvent.setup()
    const reset = vi.fn()
    const error = new Error("boom")
    render(<ErrorPage error={error} reset={reset} />)

    await user.click(screen.getByRole("button", { name: "再試行" }))

    expect(reset).toHaveBeenCalledTimes(1)
  })

  it("digest がある場合エラーコードを表示する", () => {
    const error = Object.assign(new Error("boom"), { digest: "abc123" })
    render(<ErrorPage error={error} reset={vi.fn()} />)

    expect(screen.getByText("エラーコード: abc123")).not.toBeNull()
  })

  it("digest がない場合表示しない", () => {
    const error = new Error("boom")
    render(<ErrorPage error={error} reset={vi.fn()} />)

    expect(screen.queryByText(/エラーコード:/)).toBeNull()
  })
})
