"use client";

import { useEffect, useRef } from "react";

/**
 * While `active`, a pointer press outside the returned ref's element (or the Esc key) calls
 * `onDismiss`. Used to turn "정말 삭제" back into "삭제" when the user clicks anywhere else,
 * including another record's 삭제 button. Pass a stable `onDismiss` (useCallback).
 */
export function useDismissOutside<T extends HTMLElement>(active: boolean, onDismiss: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!active) return;
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onDismiss();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [active, onDismiss]);
  return ref;
}
