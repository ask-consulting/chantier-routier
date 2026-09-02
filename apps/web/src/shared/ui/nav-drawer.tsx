'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/lib/cn';
import { CloseIcon, MenuIcon } from '@/shared/lib/icons';

/**
 * The same menu, on a phone: a button in the top bar, and a panel that slides in
 * over the page.
 *
 * **A native `<dialog>`, not a `<div>` with a high z-index.** `showModal()`
 * brings four things a hand-rolled overlay has to reimplement and usually gets
 * wrong: focus moves into the panel and cannot leave it, Escape closes, the rest
 * of the page becomes inert to a screen reader, and `::backdrop` is a real
 * element rather than a positioned sibling. The browser already owns the hard
 * part.
 *
 * **It closes when you arrive.** Tapping a destination inside a drawer that
 * stays open leaves the reader on the page they asked for, behind a panel they
 * have to dismiss — so navigation closes it, and so does the route changing
 * under it (a back button, a redirect after signing out).
 *
 * Like `Sidebar`, it knows no domain: the links and the footer are handed in.
 */
export interface NavDrawerProps {
  /** Accessible name of the button that opens it, and of the panel itself. */
  openLabel: string;
  closeLabel: string;
  title: string;
  header: ReactNode;
  footer: ReactNode;
  /** `SidebarNavItem`s — the same ones the rail uses. */
  children: ReactNode;
}

export function NavDrawer({ openLabel, closeLabel, title, header, footer, children }: NavDrawerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  // The same fact as `open`, readable from the effect below without making it a
  // dependency — otherwise opening the drawer would immediately re-run the
  // "route changed" effect and close it again.
  const openRef = useRef(false);
  const pathname = usePathname();

  const close = useCallback(() => {
    dialog.current?.close();
    openRef.current = false;
    setOpen(false);
  }, []);

  const openDrawer = useCallback(() => {
    dialog.current?.showModal();
    openRef.current = true;
    setOpen(true);
  }, []);

  // The route changed — through a link in here, the back button, or a redirect.
  // Whatever the cause, the panel has done its job.
  useEffect(() => {
    if (openRef.current) {
      close();
    }
  }, [pathname, close]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={openDrawer}
        aria-label={openLabel}
        aria-expanded={open}
        className="flex size-9 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
      >
        <MenuIcon className="size-5" aria-hidden />
      </button>

      <dialog
        ref={dialog}
        aria-label={title}
        // Escape fires `cancel` before closing; without this the element closes
        // while React still believes it is open.
        onCancel={close}
        // The backdrop is part of the dialog's own box, so a click that lands on
        // the element itself — and not on the panel inside it — is a click
        // outside. That is the whole "tap the overlay to dismiss" behaviour.
        onClick={(event) => {
          if (event.target === dialog.current) {
            close();
          }
        }}
        className={cn(
          // `me-auto` pins the panel to the starting edge, which is the right
          // edge in Arabic — no directional class, no second stylesheet.
          // `w-4/5 max-w-72`: four fifths of a narrow phone, never wider than the
          // rail's own 288px — and no arbitrary value, which the design system
          // forbids outside `globals.css`.
          'm-0 me-auto h-dvh max-h-none w-4/5 max-w-72 border-e border-border bg-surface-raised p-0',
          'text-fg backdrop:bg-scrim',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3">
            {header}
            <button
              type="button"
              onClick={close}
              aria-label={closeLabel}
              className="flex size-9 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
            >
              <CloseIcon className="size-5" aria-hidden />
            </button>
          </div>

          <nav
            aria-label={title}
            // Any tap on a destination closes it, including a tap on the page
            // you are already on. The effect above only fires when the path
            // *changes*, so without this, choosing the current section leaves
            // the reader staring at the menu, wondering what went wrong.
            onClick={(event) => {
              if ((event.target as HTMLElement).closest('a')) {
                close();
              }
            }}
            className="flex flex-1 flex-col gap-1 overflow-y-auto p-2"
          >
            {children}
          </nav>

          <div className="border-t border-border p-3">{footer}</div>
        </div>
      </dialog>
    </div>
  );
}
