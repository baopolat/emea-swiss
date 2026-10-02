"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** True when the primary input is coarse (typical phones/tablets). */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const apply = () => setCoarse(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return coarse;
}

const LONG_MS = 380;

/**
 * Long-press to start a move (mobile), short press = click.
 * Prevents the following click when a long-press fired.
 */
export function useLongPressMove(opts: {
  enabled: boolean;
  onLongPress: () => void;
  onClick: () => void;
}) {
  const timer = useRef<number | null>(null);
  const moved = useRef(false);
  const longFired = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!opts.enabled || e.button !== 0) return;
      moved.current = false;
      longFired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      clear();
      timer.current = window.setTimeout(() => {
        longFired.current = true;
        opts.onLongPress();
      }, LONG_MS);
    },
    [clear, opts],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!start.current) return;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      if (dx * dx + dy * dy > 64) {
        moved.current = true;
        clear();
      }
    },
    [clear],
  );

  const onPointerUp = useCallback(() => {
    clear();
    start.current = null;
  }, [clear]);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      if (longFired.current || moved.current) {
        e.preventDefault();
        e.stopPropagation();
        longFired.current = false;
        return;
      }
      opts.onClick();
    },
    [opts],
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onClick,
  };
}
