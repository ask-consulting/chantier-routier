'use client';

import { useTranslations } from 'next-intl';
import { useSession } from './session-provider';
import { Badge, Button } from '@/components/ui';
import { LogoutIcon } from '@/lib/icons';

/**
 * Who is signed in, and the way out.
 *
 * Renders nothing while signed out, so the header stays clean on the login and
 * invitation pages without either of them having to opt out.
 */
export function UserMenu() {
  const { user, signOut } = useSession();
  const t = useTranslations('session');

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm text-fg-muted sm:inline">
        {user.firstName} {user.lastName}
      </span>
      <Badge tone="neutral">{user.role}</Badge>
      <Button variant="ghost" size="sm" onClick={() => void signOut()} title={t('signOut')}>
        <LogoutIcon className="size-4" aria-hidden />
        <span className="sr-only">{t('signOut')}</span>
      </Button>
    </div>
  );
}
