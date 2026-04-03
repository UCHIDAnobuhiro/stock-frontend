"use client";

import { useRef, useState } from "react";
import { Upload, Image } from "lucide-react";

interface LogoDropzoneProps {
  onFile: (file: File) => void;
  isLoading: boolean;
  preview: string | null;
}

export function LogoDropzone({ onFile, isLoading, preview }: LogoDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
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
      className="relative overflow-hidden rounded-lg border-2 border-dashed transition-colors cursor-pointer"
      style={{
        borderColor: isDragOver ? "var(--color-accent)" : "var(--color-border)",
        backgroundColor: isDragOver ? "var(--color-accent-dim)" : "var(--color-surface-3)",
        minHeight: "160px",
      }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {preview ? (
        <div className="flex items-center justify-center p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="プレビュー"
            className="max-h-36 max-w-full object-contain rounded"
          />
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-2 p-6 text-center"
          style={{ color: "var(--color-text-muted)" }}
        >
          <Image className="h-8 w-8" />
          <p className="text-xs">
            ドラッグ&ドロップ<br />または クリックして選択
          </p>
        </div>
      )}
      {isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: "rgba(13,17,23,0.75)" }}
        >
          <div className="flex flex-col items-center gap-2">
            <Upload
              className="h-6 w-6 animate-bounce"
              style={{ color: "var(--color-accent)" }}
            />
            <p
              className="text-xs"
              style={{ color: "var(--color-text-secondary)" }}
            >
              ロゴを検出中...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
