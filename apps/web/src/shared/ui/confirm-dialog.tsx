'use client';

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Button } from './button';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** What will actually happen. Not "are you sure?" — that asks nothing. */
  description: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  /** `danger` for anything that destroys or revokes. */
  tone?: 'primary' | 'danger';
  /** True while the action is in flight: both buttons lock, the confirm one says so. */
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A modal question with two answers, one of which is destructive.
 *
 * **A native `<dialog>`**, like `NavDrawer`, and for the same reasons: the focus
 * trap, Escape, and an inert background come from the browser rather than from
 * three hooks that almost work. `showModal()` is called from an effect, because
 * `open` here is React state — the element's own `open` attribute would open it
 * non-modally, which is a different thing entirely and looks identical.
 *
 * **The description says what will happen, not "are you sure?".** A question
 * that carries no information is answered by reflex, which is exactly what a
 * confirmation is supposed to prevent.
 *
 * **Cancel holds the focus** when the dialog opens. The dangerous button is
 * never one Enter away from a person who opened this by accident.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = 'primary',
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) {
      return;
    }
    if (open && !element.open) {
      element.showModal();
      cancelButton.current?.focus();
    }
    if (!open && element.open) {
      element.close();
    }
  }, [open]);

  // Escape asks the same question as the cancel button, so it gets the same
  // answer — and the parent stays the only owner of `open`.
  const cancel = useCallback(
    (event: { preventDefault: () => void }) => {
      event.preventDefault();
      if (!pending) {
        onCancel();
      }
    },
    [onCancel, pending],
  );

  return (
    <dialog
      ref={dialog}
      aria-labelledby="confirm-dialog-title"
      onCancel={cancel}
      className={cn(
        'm-auto w-4/5 max-w-md rounded-surface border border-border bg-surface-overlay p-0',
        'text-fg shadow-overlay backdrop:bg-scrim',
      )}
    >
      <div className="flex flex-col gap-stack p-5">
        <h2 id="confirm-dialog-title" className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-fg-muted">{description}</p>

        {/* Reversed on a phone: the confirming action sits under the thumb, and
          * the two never end up side by side in a 320px row. */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button ref={cancelButton} variant="secondary" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={pending}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
