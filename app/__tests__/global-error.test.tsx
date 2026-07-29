import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import GlobalError from "@/app/global-error"

describe("GlobalError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("タイトルと説明文が表示される", () => {
    render(<GlobalError error={new Error("boom")} unstable_retry={vi.fn()} />)

    expect(
      screen.getByRole("heading", { name: "エラーが発生しました" })
    ).not.toBeNull()
    expect(
      screen.getByText(
        "アプリケーションで問題が発生しました。再読み込みしてください。"
      )
    ).not.toBeNull()
  })

  it("再試行ボタンをクリックすると unstable_retry が呼ばれる", async () => {
    const user = userEvent.setup()
    const unstableRetry = vi.fn()
    render(
      <GlobalError
        error={new Error("boom")}
        unstable_retry={unstableRetry}
      />
    )

    await user.click(screen.getByRole("button", { name: "再試行" }))

    expect(unstableRetry).toHaveBeenCalledTimes(1)
  })
})
