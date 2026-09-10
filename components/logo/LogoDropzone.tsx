"use client";

import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle } from "lucide-react";

interface LogoDropzoneProps {
  onFile: (file: File) => void;
  onValidationError: (message: string | null) => void;
  isLoading: boolean;
  preview: string | null;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function validateFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "画像ファイルを選択してください";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "ファイルサイズは10MB以下にしてください";
  }
  return null;
}

export function LogoDropzone({
  onFile,
  onValidationError,
  isLoading,
  preview,
}: LogoDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = (file: File) => {
    if (isLoading) return;
    const validationError = validateFile(file);
    if (validationError) {
      onValidationError(validationError);
      return;
    }
    onValidationError(null);
    onFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div
      className="rounded-3xl border border-transparent bg-[var(--color-bg)] px-5 py-7 transition-colors sm:px-8 sm:py-9"
      style={{
        borderColor: isDragOver ? "var(--color-accent)" : undefined,
        backgroundColor: isDragOver ? "var(--color-accent-dim)" : undefined,
      }}
      onDragOver={(event) => { event.preventDefault(); if (!isLoading) setIsDragOver(true); }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragOver(false);
      }}
      onDrop={handleDrop}
      aria-busy={isLoading}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="ロゴ画像"
        disabled={isLoading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
          // The same image can be retried after a validation or network error.
          event.target.value = "";
        }}
      />
      <div className="flex flex-col items-center text-center">
        {preview ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={preview} alt="選択したロゴ画像" className="mb-5 max-h-44 max-w-full rounded-2xl object-contain" />
        ) : (
          <>
            <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-[var(--color-surface-1)] text-[var(--color-accent)] shadow-sm">
              <ImagePlus className="size-7" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <h3 className="text-lg font-medium tracking-tight sm:text-xl">写真から、企業を見つける。</h3>
            <p className="mt-3 hidden text-sm text-[var(--color-text-secondary)] md:block">
              画像をドラッグ＆ドロップ
            </p>
          </>
        )}
        <button
          type="button"
          disabled={isLoading}
          onClick={() => inputRef.current?.click()}
          className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60 md:w-auto md:min-w-44"
        >
          {isLoading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
          {isLoading ? "ロゴを検出中…" : preview ? "別の写真を選ぶ" : "写真を選ぶ"}
        </button>
        {isLoading ? (
          <p role="status" className="mt-3 text-xs text-[var(--color-text-secondary)]">画像からロゴの候補を探しています。</p>
        ) : (
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">JPG・PNGなどの画像 · 10MBまで</p>
        )}
      </div>
    </div>
  );
}
