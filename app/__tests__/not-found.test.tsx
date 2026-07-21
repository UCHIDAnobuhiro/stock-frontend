import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import NotFound from "@/app/not-found"

describe("NotFound", () => {
  it("404 とページが見つかりませんが表示される", () => {
    render(<NotFound />)

    expect(screen.getByText("404")).not.toBeNull()
    expect(
      screen.getByRole("heading", { name: "ページが見つかりません" })
    ).not.toBeNull()
  })

  it("ホームに戻るリンクが / を指す", () => {
    render(<NotFound />)

    const link = screen.getByRole("link", {
      name: "ホームに戻る",
    }) as HTMLAnchorElement
    expect(link.getAttribute("href")).toBe("/")
  })
})
