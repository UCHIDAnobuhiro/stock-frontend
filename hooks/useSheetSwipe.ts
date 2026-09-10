"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";

/** Only the handle captures gestures, leaving scrolling and row sorting independent. */
export function useSheetSwipe(onClose: () => void) {
  const dragStart = useRef<{ id: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const finishDrag = (event: PointerEvent<HTMLButtonElement>, cancelled = false) => {
    if (dragStart.current?.id !== event.pointerId) return;
    const distance = event.clientY - dragStart.current.y;
    dragStart.current = null;
    setIsDragging(false);
    setDragOffset(0);
    if (!cancelled && distance >= 72) onClose();
  };

  return {
    style: {
      "--sheet-drag-offset": `${dragOffset}px`,
      transition: isDragging ? "none" : undefined,
    } as CSSProperties,
    handleProps: {
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        if (!event.isPrimary || event.button !== 0) return;
        dragStart.current = { id: event.pointerId, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
        setIsDragging(true);
      },
      onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
        if (dragStart.current?.id === event.pointerId) {
          setDragOffset(Math.max(0, event.clientY - dragStart.current.y));
        }
      },
      onPointerUp: (event: PointerEvent<HTMLButtonElement>) => finishDrag(event),
      onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => finishDrag(event, true),
      onLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) => finishDrag(event, true),
    },
  };
}
