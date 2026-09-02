'use client';

import { useTranslations } from 'next-intl';
import { Logo } from '@/shared/brand';
import { cn } from '@/shared/lib/cn';
import { LocaleSwitcher } from '@/shared/i18n/locale-switcher';
import { ThemeToggle } from '@/shared/theme/theme-toggle';
import { NavDrawer } from '@/shared/ui';
import { UserMenu, useSession } from '@/features/auth';
import { NavLinks } from './nav';

/**
 * The top bar — the whole navigation below `lg`, and the whole chrome of the
 * signed-out screens at any width.
 *
 * It hides itself on desktop *only once there is a session*, because that is
 * exactly when the rail appears and carries the same things. On the login page
 * there is no rail, so the bar stays: otherwise a visitor on a desktop would
 * lose the language and theme controls, which is the one screen where somebody
 * may badly need to switch to Arabic.
 *
 * **Signed in on a phone, the bar holds a button and a logo, and nothing else.**
 * The account, the theme and the language live in the drawer's footer — the same
 * place they live in the rail. Putting them in the bar *as well* would be two
 * controls for one setting, on the screen with the least room for either.
 */
export function AppHeader() {
  const { user } = useSession();
  const t = useTranslations('nav');

  return (
    <header className={cn('border-b border-border bg-surface-raised', user && 'lg:hidden')}>
      <div className="mx-auto flex max-w-content items-center justify-between px-gutter py-3 lg:px-gutter-lg">
        <div className="flex items-center gap-2">
          {user && (
            <NavDrawer
              openLabel={t('open')}
              closeLabel={t('close')}
              title={t('main')}
              header={<Logo />}
              footer={
                <div className="flex flex-col gap-3">
                  <UserMenu layout="stack" />
                  <div className="flex items-center justify-between gap-2">
                    <ThemeToggle />
                    <LocaleSwitcher />
                  </div>
                </div>
              }
            >
              <NavLinks />
            </NavDrawer>
          )}
          <Logo />
        </div>

        {/* Signed out: no drawer to hold them, so they stay in the bar. */}
        {!user && (
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        )}
      </div>
    </header>
  );
}
