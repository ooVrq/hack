"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function Dialog({
  open,
  onClose,
  title,
  children,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="max-w-md border border-border bg-background p-0 font-mono text-foreground backdrop:bg-black/70"
    >
      <div className="flex flex-col gap-5 p-6">
        <h2 className="text-lg text-foreground">{title}</h2>
        <div className="text-sm leading-relaxed text-muted">{children}</div>
        <div className="flex gap-3">{actions}</div>
      </div>
    </dialog>
  );
}
