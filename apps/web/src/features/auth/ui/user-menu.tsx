'use client';

import { useTranslations } from 'next-intl';
import { useSession } from '../model/session-provider';
import { Badge, Button } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { LogoutIcon } from '@/shared/lib/icons';

/**
 * Who is signed in, and the way out.
 *
 * Renders nothing while signed out, so the header stays clean on the login and
 * invitation pages without either of them having to opt out.
 *
 * Three layouts, one component, because it is the same information in three
 * widths — a second component would drift from this one on the first change:
 *
 *   - `row`   the top bar: name, role, way out, side by side.
 *   - `stack` the open sidebar footer: the same, stacked, full width.
 *   - `icon`  the collapsed sidebar: the way out alone. 64px holds an icon.
 */
export type UserMenuLayout = 'row' | 'stack' | 'icon';

export function UserMenu({ layout = 'row' }: { layout?: UserMenuLayout }) {
  const { user, signOut } = useSession();
  const t = useTranslations('session');
  // The role was showing its raw enum value — `site_manager` — in both
  // languages. The labels already existed in the message bundles.
  const tRole = useTranslations('userRole');

  if (!user) {
    return null;
  }

  const signOutButton = (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => void signOut()}
      title={t('signOut')}
      // `w-full`, not `justify-start`: the button already sets `justify-center`,
      // and two utilities for the same property are settled by their order in the
      // generated stylesheet, not by the order here (docs/15 §3). A class that
      // adds always wins; one that overrides is a coin toss.
      className={layout === 'stack' ? 'w-full' : undefined}
    >
      <LogoutIcon className="size-4" aria-hidden />
      {layout === 'stack' ? <span>{t('signOut')}</span> : <span className="sr-only">{t('signOut')}</span>}
    </Button>
  );

  if (layout === 'icon') {
    return signOutButton;
  }

  return (
    <div className={cn(layout === 'stack' ? 'flex flex-col gap-2' : 'flex items-center gap-2')}>
      <div
        className={cn(
          'flex gap-2',
          // Stacked, the name gets its own line: side by side in a 256px rail it
          // truncates to "Abdellatif E…" and the badge takes the rest.
          layout === 'stack' ? 'flex-col items-start px-3' : 'items-center',
        )}
      >
        <span
          className={cn(
            'truncate text-sm text-fg-muted',
            // Hidden on a narrow top bar, always shown in the sidebar: there,
            // the width is the one thing we have.
            layout === 'row' && 'hidden sm:inline',
          )}
        >
          {user.firstName} {user.lastName}
        </span>
        <Badge tone="neutral">{tRole(user.role)}</Badge>
      </div>
      {signOutButton}
    </div>
  );
}
