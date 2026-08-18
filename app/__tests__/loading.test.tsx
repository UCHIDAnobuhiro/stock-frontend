import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Loading from "@/app/loading";

describe("Loading", () => {
  it("ページ遷移中の案内を表示する", () => {
    render(<Loading />);

    expect(screen.getByRole("status").textContent).toContain(
      "画面を読み込んでいます...",
    );
  });
});
