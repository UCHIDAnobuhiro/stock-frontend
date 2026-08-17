import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LogoDetectResults } from "@/components/logo/LogoDetectResults";

const results = [
  { name: "Google", confidence: 0.85 },
  { name: "Facebook", confidence: 0.83 },
];

describe("LogoDetectResults", () => {
  it("検出結果にはチャート・ウォッチリスト操作を表示しない", () => {
    render(
      <LogoDetectResults
        results={results}
        onAnalyze={vi.fn()}
        isAnalyzing={false}
        analysisTarget={null}
        hasAnalysis={false}
      />,
    );

    expect(screen.queryByRole("button", { name: /チャート/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /ウォッチリスト/ })).toBeNull();
  });

  it("選択した検出結果を企業分析へ渡す", () => {
    const onAnalyze = vi.fn();
    render(
      <LogoDetectResults
        results={results}
        onAnalyze={onAnalyze}
        isAnalyzing={false}
        analysisTarget={null}
        hasAnalysis={false}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Facebookを企業分析" }),
    );

    expect(onAnalyze).toHaveBeenCalledWith("Facebook");
  });

  it("分析中は対象を表示して全ボタンを無効化し、分析後は対象だけ再分析と表示する", () => {
    const { rerender } = render(
      <LogoDetectResults
        results={results}
        onAnalyze={vi.fn()}
        isAnalyzing
        analysisTarget="Google"
        hasAnalysis={false}
      />,
    );

    expect(
      (
        screen.getByRole("button", {
          name: "Googleを分析中...",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: "Facebookを企業分析",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    rerender(
      <LogoDetectResults
        results={results}
        onAnalyze={vi.fn()}
        isAnalyzing={false}
        analysisTarget="Google"
        hasAnalysis
      />,
    );

    expect(
      (
        screen.getByRole("button", {
          name: "Googleを再分析",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    expect(
      screen.getByRole("button", { name: "Facebookを企業分析" }),
    ).toBeTruthy();
  });
});
