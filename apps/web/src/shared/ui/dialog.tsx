'use client';

import { useCallback, useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { cn } from '@/shared/lib/cn';
import { Button } from './button';
import { CloseIcon } from '@/shared/lib/icons';

export interface DialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  /** Buttons. Laid out by the caller — a form's footer is not a question's. */
  footer?: ReactNode;
  /** Escape, the backdrop and the close button all come here. */
  onClose: () => void;
  /** Locks the ways out while something is in flight. */
  busy?: boolean;
  /** Wider, for a form. The default suits a question. */
  size?: 'sm' | 'md';
  /** Accessible name of the close button — `shared/ui` holds no wording. */
  closeLabel: string;
  /**
   * What holds the focus when it opens. Without it the browser picks the first
   * focusable element, which on a destructive question is one Tab away from the
   * button that destroys.
   */
  initialFocus?: RefObject<HTMLElement | null>;
}

/**
 * The modal shell: a native `<dialog>`, a title, a body, a footer.
 *
 * **Native, for the four things it brings free** — focus enters the panel and
 * cannot leave, Escape closes, the rest of the page goes inert for a screen
 * reader, and `::backdrop` is a real element. `showModal()` is called from an
 * effect because `open` here is React state; the element's own `open` attribute
 * would open it *non-modally*, which looks identical and behaves differently.
 *
 * `ConfirmDialog` is this component with two buttons and a question. Anything
 * with a form in it uses this one directly — a confirmation whose body is a form
 * is not a confirmation any more.
 */
export function Dialog({
  open,
  title,
  children,
  footer,
  onClose,
  busy = false,
  size = 'sm',
  closeLabel,
  initialFocus,
}: DialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) {
      return;
    }
    if (open && !element.open) {
      element.showModal();
      initialFocus?.current?.focus();
    }
    if (!open && element.open) {
      element.close();
    }
  }, [open, initialFocus]);

  const close = useCallback(() => {
    if (!busy) {
      onClose();
    }
  }, [busy, onClose]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      // Escape fires `cancel` first; without this the element closes while React
      // still believes it is open, and the next `open` does nothing.
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      // A click landing on the element itself — not on the panel inside it — is
      // a click on the backdrop.
      onClick={(event) => {
        if (event.target === dialog.current) {
          close();
        }
      }}
      className={cn(
        'm-auto w-4/5 rounded-surface border border-border bg-surface-overlay p-0',
        'text-fg shadow-overlay backdrop:bg-scrim',
        size === 'md' ? 'max-w-lg' : 'max-w-md',
      )}
    >
      {/* `max-h-dvh` rather than a percentage: it caps the panel at the visible
        * viewport — the *dynamic* one, so a phone's address bar sliding away
        * does not leave the footer under it. The body below scrolls inside. */}
      <div className="flex max-h-dvh flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight">
            {title}
          </h2>
          <Button variant="ghost" size="icon" onClick={close} aria-label={closeLabel} disabled={busy}>
            <CloseIcon className="size-4 shrink-0" aria-hidden />
          </Button>
        </div>

        {/* Scrolls inside itself: a long form must not push its own buttons off
          * the bottom of a phone screen. */}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && <div className="border-t border-border px-5 py-4">{footer}</div>}
      </div>
    </dialog>
  );
}
