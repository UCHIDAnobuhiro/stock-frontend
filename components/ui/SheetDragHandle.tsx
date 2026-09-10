"use client";

import type { ComponentProps } from "react";

export function SheetDragHandle({ onClose, ...props }: ComponentProps<"button"> & { onClose: () => void }) {
  return (
    <button
      type="button"
      className="flex h-7 w-full shrink-0 touch-none select-none items-center justify-center md:hidden"
      {...props}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <span aria-hidden="true" className="h-1 w-9 rounded-full bg-[var(--color-border)]" />
    </button>
  );
}
