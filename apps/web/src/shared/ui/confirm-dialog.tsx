'use client';

import { useRef, type ReactNode } from 'react';
import { Button } from './button';
import { Dialog } from './dialog';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** What will actually happen. Not "are you sure?" — that asks nothing. */
  description: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  /** `danger` for anything that destroys or revokes. */
  tone?: 'primary' | 'danger';
  /** True while the action is in flight: both buttons lock. */
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A modal question with two answers, one of which is destructive.
 *
 * `Dialog` with two buttons and a sentence — one native `<dialog>` in the code
 * base rather than two implementations drifting apart.
 *
 * **The description says what will happen, not "are you sure?".** A question
 * that carries no information is answered by reflex, which is exactly what a
 * confirmation is supposed to prevent.
 *
 * **Cancel holds the focus** when it opens. The dangerous button is never one
 * Enter away from somebody who opened this by accident.
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
  const cancelButton = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      open={open}
      title={title}
      onClose={onCancel}
      busy={pending}
      closeLabel={cancelLabel}
      initialFocus={cancelButton}
      footer={
        // Reversed on a phone: the confirming action sits under the thumb, and
        // the two never end up side by side in a 320px row.
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button ref={cancelButton} variant="secondary" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={pending}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-fg-muted">{description}</p>
    </Dialog>
  );
}
