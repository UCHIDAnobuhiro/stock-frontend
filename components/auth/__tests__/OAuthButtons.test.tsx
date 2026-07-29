import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

type Provider = "Google" | "GitHub";

function getOAuthLink(provider: Provider) {
  const link = screen.getByRole("link", { name: `${provider}で続ける` });
  link.addEventListener("click", (event) => event.preventDefault());
  return link;
}

describe("OAuthButtons", () => {
  it.each(["Google", "GitHub"] satisfies Provider[])(
    "%s のOAuth遷移から戻るとボタンを再び操作できる",
    (provider) => {
      render(<OAuthButtons />);
      const selectedLink = getOAuthLink(provider);
      const otherLink = getOAuthLink(provider === "Google" ? "GitHub" : "Google");

      fireEvent.click(selectedLink);

      expect(selectedLink.getAttribute("aria-disabled")).toBe("true");
      expect(otherLink.getAttribute("aria-disabled")).toBe("true");
      expect(selectedLink.classList.contains("pointer-events-none")).toBe(true);
      expect(otherLink.classList.contains("pointer-events-none")).toBe(true);
      expect(selectedLink.classList.contains("opacity-70")).toBe(true);
      expect(otherLink.classList.contains("opacity-70")).toBe(true);

      fireEvent(window, new Event("pageshow"));

      expect(selectedLink.getAttribute("aria-disabled")).toBe("false");
      expect(otherLink.getAttribute("aria-disabled")).toBe("false");
      expect(selectedLink.classList.contains("pointer-events-none")).toBe(false);
      expect(otherLink.classList.contains("pointer-events-none")).toBe(false);
      expect(selectedLink.classList.contains("opacity-70")).toBe(false);
      expect(otherLink.classList.contains("opacity-70")).toBe(false);
    },
  );

  it("OAuth遷移中は別のプロバイダーへの遷移を開始しない", () => {
    render(<OAuthButtons />);
    const googleLink = getOAuthLink("Google");
    const githubLink = getOAuthLink("GitHub");

    fireEvent.click(googleLink);
    const clickCompleted = fireEvent.click(githubLink);

    expect(clickCompleted).toBe(false);
    expect(googleLink.classList.contains("opacity-70")).toBe(true);
    expect(githubLink.classList.contains("opacity-70")).toBe(true);
  });
});
