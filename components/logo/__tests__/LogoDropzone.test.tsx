import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { LogoDropzone } from "@/components/logo/LogoDropzone";

describe("LogoDropzone", () => {
  it("非画像ファイルを選択した場合は理由を通知し、検索を開始しない", () => {
    const onFile = vi.fn();
    const onValidationError = vi.fn();
    const { container } = render(
      <LogoDropzone
        onFile={onFile}
        onValidationError={onValidationError}
        isLoading={false}
        preview={null}
      />,
    );
    const input = container.querySelector("input");
    const file = new File(["text"], "notes.txt", { type: "text/plain" });

    fireEvent.change(input!, { target: { files: [file] } });

    expect(onValidationError).toHaveBeenCalledWith(
      "画像ファイルを選択してください",
    );
    expect(onFile).not.toHaveBeenCalled();
  });

  it("画像ファイルを選択した場合は以前のバリデーションエラーを消して検索を開始する", () => {
    const onFile = vi.fn();
    const onValidationError = vi.fn();
    const { container } = render(
      <LogoDropzone
        onFile={onFile}
        onValidationError={onValidationError}
        isLoading={false}
        preview={null}
      />,
    );
    const input = container.querySelector("input");
    const file = new File(["image"], "logo.png", { type: "image/png" });

    fireEvent.change(input!, { target: { files: [file] } });

    expect(onValidationError).toHaveBeenCalledWith(null);
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it("10MBを超える画像を選択した場合は理由を通知し、検索を開始しない", () => {
    const onFile = vi.fn();
    const onValidationError = vi.fn();
    const { container } = render(
      <LogoDropzone
        onFile={onFile}
        onValidationError={onValidationError}
        isLoading={false}
        preview={null}
      />,
    );
    const input = container.querySelector("input");
    const file = new File(["image"], "large-logo.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: 10 * 1024 * 1024 + 1 });

    fireEvent.change(input!, { target: { files: [file] } });

    expect(onValidationError).toHaveBeenCalledWith(
      "ファイルサイズは10MB以下にしてください",
    );
    expect(onFile).not.toHaveBeenCalled();
  });

  it("10MB以下の画像をドロップした場合は検索を開始する", () => {
    const onFile = vi.fn();
    const onValidationError = vi.fn();
    const { container } = render(
      <LogoDropzone
        onFile={onFile}
        onValidationError={onValidationError}
        isLoading={false}
        preview={null}
      />,
    );
    const dropzone = container.firstElementChild!;
    const file = new File(["image"], "logo.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: 10 * 1024 * 1024 });

    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    expect(onValidationError).toHaveBeenCalledWith(null);
    expect(onFile).toHaveBeenCalledWith(file);
  });
});
