"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";

/**
 * Modal yes/no question on the native <dialog> element (focus trap, Esc to cancel, backdrop).
 * The repo has no shadcn dialog yet; swap this for it if the team adds one.
 */
export function ConfirmDialog({ open, title, children, confirmLabel = "예", cancelLabel = "아니오", pending = false, onConfirm, onCancel }: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onCancel(); }}
      className="m-auto w-[min(26rem,calc(100%-2rem))] rounded-xl border bg-card p-6 text-card-foreground shadow-lg backdrop:bg-black/40">
      <div className="flex flex-col gap-4">
        <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
        {children && <div className="text-sm text-muted-foreground">{children}</div>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>{cancelLabel}</Button>
          <Button type="button" onClick={onConfirm} disabled={pending}>{pending ? "처리 중…" : confirmLabel}</Button>
        </div>
      </div>
    </dialog>
  );
}
