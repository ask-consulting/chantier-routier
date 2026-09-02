'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from 'react';
import { cn } from '@/shared/lib/cn';
import { SidebarCollapseIcon, SidebarExpandIcon } from '@/shared/lib/icons';

/**
 * The application's left rail: logo at the top, navigation in the middle,
 * account and settings at the bottom. Collapsible to an icon-only strip.
 *
 * **It knows no domain.** The links, the logo and whatever sits at the bottom
 * are handed in by the route that composes it — `shared/` may not import a
 * feature (rule 6 of `docs/13`), and a sidebar that imported `auth` to draw its
 * own footer would break exactly that rule. `header` and `footer` are functions
 * of the collapsed state rather than plain nodes, so the caller decides what a
 * 64px-wide version of itself looks like without this file knowing.
 *
 * **Desktop only.** Hidden below `lg`, where the top bar carries the same
 * things: a rail that eats a third of a phone screen is not a menu, it is a
 * modal, and that is a different component.
 *
 * **Right-to-left comes for free.** The rail is the first child of a flex row,
 * so `dir="rtl"` on `<html>` puts it on the right; the border is logical
 * (`border-e`). The only thing that does not mirror itself is the toggle icon,
 * which is flipped explicitly.
 */

/** Read server-side in the layout, so the first paint already has the right width. */
export const SIDEBAR_COOKIE = 'chantia.sidebar';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Internal, and staying that way: the nav items need the collapsed state, the
 * caller's `header`/`footer` get it as an argument. Exporting a hook would let a
 * feature reach for the sidebar's state and quietly couple the two.
 */
const CollapsedContext = createContext(false);

export interface SidebarProps {
  /** From the cookie, so a collapsed rail does not flash open on every load. */
  defaultCollapsed?: boolean;
  /** Accessible name of the `<nav>` landmark — there is more than one on a page. */
  navLabel: string;
  collapseLabel: string;
  expandLabel: string;
  header: (collapsed: boolean) => ReactNode;
  footer: (collapsed: boolean) => ReactNode;
  /** `SidebarNavItem`s. */
  children: ReactNode;
}

export function Sidebar({
  defaultCollapsed = false,
  navLabel,
  collapseLabel,
  expandLabel,
  header,
  footer,
  children,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const toggle = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous;
      // Written from the browser rather than through a server action: unlike the
      // locale, nothing is rendered server-side from this value — it only has to
      // be there on the *next* load, which is what a cookie is.
      document.cookie = `${SIDEBAR_COOKIE}=${next ? 'collapsed' : 'expanded'}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; samesite=lax`;
      return next;
    });
  }, []);

  const ToggleIcon = collapsed ? SidebarExpandIcon : SidebarCollapseIcon;
  const toggleLabel = collapsed ? expandLabel : collapseLabel;

  return (
    <div
      className={cn(
        'hidden shrink-0 flex-col border-e border-border bg-surface-raised transition-[width] lg:flex',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className={cn('flex h-14 items-center border-b border-border px-3', collapsed && 'justify-center px-0')}>
        {header(collapsed)}
      </div>

      <nav aria-label={navLabel} className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        <CollapsedContext.Provider value={collapsed}>{children}</CollapsedContext.Provider>
      </nav>

      <div className="p-2">
        <button
          type="button"
          onClick={toggle}
          // `aria-expanded` on the control, not the rail: the button is what
          // changes state, and a screen reader announces it from here.
          aria-expanded={!collapsed}
          aria-label={toggleLabel}
          title={toggleLabel}
          className={cn(
            'flex h-9 w-full items-center gap-3 rounded-control px-3 text-sm',
            'text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg',
            collapsed && 'justify-center px-0',
          )}
        >
          {/* Mirrored in Arabic: the icon draws a panel on the left, and in a
            * right-to-left layout the panel is on the right. */}
          <ToggleIcon className="size-4 shrink-0 rtl:-scale-x-100" aria-hidden />
          {!collapsed && <span>{toggleLabel}</span>}
        </button>
      </div>

      <div className={cn('border-t border-border p-2', collapsed && 'flex flex-col items-center')}>
        {footer(collapsed)}
      </div>
    </div>
  );
}

export interface SidebarNavItemProps {
  href: string;
  label: string;
  /** Any Lucide icon, or one of the two drawn in `shared/lib/icons`. */
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

/**
 * One destination.
 *
 * The label is never removed, only hidden (`sr-only`) — a collapsed rail is a
 * visual shorthand, not a different menu, and a screen reader must still be
 * able to read what the icon means.
 */
export function SidebarNavItem({ href, label, icon: Icon }: SidebarNavItemProps) {
  const collapsed = useContext(CollapsedContext);
  const pathname = usePathname();
  // `startsWith` with the trailing slash, so `/worksites/42` keeps "Chantiers"
  // marked while `/worksites-archive` — a route that may exist one day — does not.
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      // What a screen reader uses to announce the current page. The colour says
      // the same thing to everyone else, which is why both are here.
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        'flex h-10 items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors',
        collapsed && 'justify-center px-0',
        active
          ? 'bg-primary-subtle text-primary-on-subtle'
          : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
      )}
    >
      {/* Decorative: the label next to it says the same thing. */}
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className={cn(collapsed && 'sr-only')}>{label}</span>
    </Link>
  );
}
