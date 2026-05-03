"use client";

import { useState } from "react";

interface SymbolLogoProps {
  code: string;
  logoUrl?: string | null;
  size?: number;
}

export function SymbolLogo({ code, logoUrl, size = 20 }: SymbolLogoProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  // logoUrl が変われば failed は自動的に false になる
  const failed = !!logoUrl && logoUrl === failedUrl;

  const initial = code.replace(/[^A-Za-z]/g, "")[0]?.toUpperCase() ?? "?";
  const fontSize = Math.max(8, Math.floor(size * 0.45));

  if (logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`${code} logo`}
        width={size}
        height={size}
        className="rounded-full object-contain shrink-0"
        onError={() => setFailedUrl(logoUrl)}
      />
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center rounded-full shrink-0 font-semibold select-none"
      style={{
        width: size,
        height: size,
        fontSize,
        backgroundColor: "var(--color-surface-3)",
        color: "var(--color-text-secondary)",
      }}
    >
      {initial}
    </span>
  );
}
