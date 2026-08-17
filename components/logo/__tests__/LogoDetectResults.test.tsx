import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LogoDetectResults } from "@/components/logo/LogoDetectResults";

const results = [{ name: "Google", confidence: 0.85 }];

describe("LogoDetectResults", () => {
  it("検出結果にはチャート・ウォッチリスト操作を表示しない", () => {
    render(
      <LogoDetectResults
        results={results}
        onAnalyze={vi.fn()}
        isAnalyzing={false}
        hasAnalysis={false}
      />,
    );

    expect(screen.queryByRole("button", { name: /チャート/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /ウォッチリスト/ })).toBeNull();
  });

  it("最上位の検出結果を企業分析へ渡す", () => {
    const onAnalyze = vi.fn();
    render(
      <LogoDetectResults
        results={results}
        onAnalyze={onAnalyze}
        isAnalyzing={false}
        hasAnalysis={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "企業分析を生成" }));

    expect(onAnalyze).toHaveBeenCalledWith("Google");
  });

  it("分析中はボタンを無効化し、分析後は再生成と表示する", () => {
    const { rerender } = render(
      <LogoDetectResults
        results={results}
        onAnalyze={vi.fn()}
        isAnalyzing
        hasAnalysis={false}
      />,
    );

    expect(
      (
        screen.getByRole("button", {
          name: "企業分析を生成中...",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    rerender(
      <LogoDetectResults
        results={results}
        onAnalyze={vi.fn()}
        isAnalyzing={false}
        hasAnalysis
      />,
    );

    expect(
      (
        screen.getByRole("button", {
          name: "企業分析を再生成",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });
});
