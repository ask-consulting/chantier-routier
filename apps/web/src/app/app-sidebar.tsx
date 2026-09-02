'use client';

import { useTranslations } from 'next-intl';
import { Logo } from '@/shared/brand';
import { Sidebar } from '@/shared/ui';
import { LocaleSwitcher } from '@/shared/i18n/locale-switcher';
import { ThemeToggle } from '@/shared/theme/theme-toggle';
import { UserMenu, useSession } from '@/features/auth';
import { NavLinks } from './nav';

/**
 * The rail, filled in.
 *
 * This is the one place that knows both the design system and the domain — a
 * route composes, which is exactly what `app/` is for. `shared/ui/sidebar.tsx`
 * stays domain-blind, and `features/auth` never learns that a sidebar exists.
 *
 * The destinations come from `nav.tsx`, shared with the phone drawer: same list,
 * same order, same active state, whatever the width.
 */
export function AppSidebar({ defaultCollapsed }: { defaultCollapsed: boolean }) {
  const t = useTranslations('nav');
  const { user } = useSession();

  // Signed out — the login and invitation screens get the top bar and nothing
  // else. Rendering an empty rail there would be a menu with no destinations.
  if (!user) {
    return null;
  }

  return (
    <Sidebar
      defaultCollapsed={defaultCollapsed}
      navLabel={t('main')}
      collapseLabel={t('collapse')}
      expandLabel={t('expand')}
      header={(collapsed) => <Logo markOnly={collapsed} />}
      footer={(collapsed) => (
        <div className={collapsed ? 'flex flex-col items-center gap-2' : 'flex flex-col gap-3'}>
          {/* Collapsed, the account keeps only its way out: 64px holds an icon,
            * not a name and a role. */}
          <UserMenu layout={collapsed ? 'icon' : 'stack'} />
          <div
            className={
              collapsed
                ? 'flex flex-col items-center gap-2'
                : 'flex items-center justify-between gap-2'
            }
          >
            {/* Both stack rather than disappear: a setting you cannot reach
              * without expanding the menu first is a setting you have lost. */}
            <ThemeToggle orientation={collapsed ? 'column' : 'row'} />
            <LocaleSwitcher orientation={collapsed ? 'column' : 'row'} />
          </div>
        </div>
      )}
    >
      <NavLinks />
    </Sidebar>
  );
}
