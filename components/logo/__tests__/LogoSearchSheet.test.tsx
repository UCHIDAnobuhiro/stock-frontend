import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LogoSearchSheet } from "@/components/logo/LogoSearchSheet";

const {
  mockDetect,
  mockResetDetect,
  mockUseLogoDetect,
  mockResetAnalysis,
} = vi.hoisted(() => ({
  mockDetect: vi.fn(),
  mockResetDetect: vi.fn(),
  mockUseLogoDetect: vi.fn(),
  mockResetAnalysis: vi.fn(),
}));

vi.mock("@/hooks/useLogoDetect", () => ({
  useLogoDetect: () => mockUseLogoDetect(),
}));

vi.mock("@/hooks/useLogoAnalyze", () => ({
  useLogoAnalyze: () => ({
    analysis: null,
    isLoading: false,
    error: null,
    analyze: vi.fn(),
    reset: mockResetAnalysis,
  }),
}));

vi.mock("@/hooks/useWatchlist", () => ({
  useWatchlist: () => ({ addSymbol: vi.fn() }),
}));

vi.mock("@/hooks/useSelectedSymbol", () => ({
  useSelectedSymbol: () => ({ setSymbol: vi.fn() }),
}));

vi.mock("@/hooks/useSymbols", () => ({
  useSymbols: () => ({ symbols: [] }),
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/logo/LogoDropzone", () => ({
  LogoDropzone: ({
    onFile,
  }: {
    onFile: (file: File) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onFile(new File(["image"], "logo.png", { type: "image/png" }))
      }
    >
      画像を選択
    </button>
  ),
}));

vi.mock("@/components/logo/CompanyAnalysisCard", () => ({
  CompanyAnalysisCard: () => null,
}));

vi.mock("@/components/logo/LogoDetectResults", () => ({
  LogoDetectResults: () => <div>検出結果</div>,
}));

describe("LogoSearchSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLogoDetect.mockReturnValue({
      results: [],
      hasSearched: false,
      isLoading: false,
      error: null,
      detect: mockDetect,
      reset: mockResetDetect,
    });
    mockDetect.mockResolvedValue([]);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:logo-preview"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("検索前は未検出メッセージを表示しない", () => {
    render(<LogoSearchSheet open onOpenChange={vi.fn()} />);

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("検索完了後の結果が0件なら未検出メッセージを表示する", () => {
    mockUseLogoDetect.mockReturnValue({
      results: [],
      hasSearched: true,
      isLoading: false,
      error: null,
      detect: mockDetect,
      reset: mockResetDetect,
    });

    render(<LogoSearchSheet open onOpenChange={vi.fn()} />);

    expect(screen.getByRole("status").textContent).toContain(
      "ロゴを検出できませんでした",
    );
  });

  it("検索中は前回の未検出メッセージを表示しない", () => {
    mockUseLogoDetect.mockReturnValue({
      results: [],
      hasSearched: true,
      isLoading: true,
      error: null,
      detect: mockDetect,
      reset: mockResetDetect,
    });

    render(<LogoSearchSheet open onOpenChange={vi.fn()} />);

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("APIエラー時はエラーを表示し、未検出メッセージとは重複させない", () => {
    mockUseLogoDetect.mockReturnValue({
      results: [],
      hasSearched: false,
      isLoading: false,
      error: "ロゴ検出に失敗しました",
      detect: mockDetect,
      reset: mockResetDetect,
    });

    render(<LogoSearchSheet open onOpenChange={vi.fn()} />);

    expect(screen.getByRole("alert").textContent).toBe(
      "ロゴ検出に失敗しました",
    );
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("ロゴ検出のrejectを処理し、SWRのエラー表示に委ねる", async () => {
    mockDetect.mockRejectedValue(new Error("ロゴ検出に失敗しました"));
    render(<LogoSearchSheet open onOpenChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "画像を選択" }));

    await waitFor(() => expect(mockDetect).toHaveBeenCalledOnce());
  });

  it("別の画像を試すと検出状態と分析状態をリセットする", () => {
    mockUseLogoDetect.mockReturnValue({
      results: [{ name: "Example Corp", confidence: 0.9 }],
      hasSearched: true,
      isLoading: false,
      error: null,
      detect: mockDetect,
      reset: mockResetDetect,
    });
    render(<LogoSearchSheet open onOpenChange={vi.fn()} />);

    fireEvent.click(
      screen.getByRole("button", { name: "別の画像を試す" }),
    );

    expect(mockResetDetect).toHaveBeenCalledOnce();
    expect(mockResetAnalysis).toHaveBeenCalledOnce();
  });
});
