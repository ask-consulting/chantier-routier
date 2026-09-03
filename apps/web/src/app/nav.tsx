'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Permission } from '@chantia/shared';
import { AccountIcon, WorkerIcon, WorksiteIcon } from '@/shared/lib/icons';
import { SidebarNavGroup, SidebarNavItem } from '@/shared/ui';
import { Can } from '@/features/auth';

/**
 * Where the application can go — the one list, rendered by both the desktop rail
 * and the phone drawer. Two lists would drift the first time a section is added
 * to one and not the other.
 *
 * **Only routes that exist.** `messages/*.json` also carries `nav.timesheets`
 * and `nav.expenses`, and `icons.ts` has their icons — but a link to a route
 * that does not exist is a 404 with a friendly label. Each lands with its
 * screen; adding one here is one line.
 *
 * **Some entries carry a permission, some do not.** Worksites is readable by
 * every role (`docs/09`'s matrix gives `WORKSITE_READ` to all four), so it is
 * never wrapped. Workers is not — a field worker has no reason to see the
 * payroll — so it is gated the same way the accounts group already is.
 *
 * **The accounts section is a group, not a link.** `/users` has no screen yet;
 * the group header opens and closes, and goes nowhere. It is also gated on
 * `USER_READ`, so a foreman never sees a section whose every destination would
 * answer 403 — the API enforces the same rule, this only spares a dead end.
 */
export const NAV = [
  { href: '/worksites', key: 'worksites', Icon: WorksiteIcon },
  { href: '/workers', key: 'workers', Icon: WorkerIcon, permission: Permission.WORKER_READ },
] as const;

export const USERS_NAV = [
  { href: '/users/invitations', key: 'invitations', Icon: AccountIcon },
] as const;

export function NavLinks() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <>
      {NAV.map(({ href, key, Icon, ...rest }) => {
        const item = <SidebarNavItem key={href} href={href} label={t(key)} icon={Icon} />;
        // Not every entry needs one — see the comment above `NAV`.
        return 'permission' in rest ? (
          <Can key={href} permission={rest.permission}>
            {item}
          </Can>
        ) : (
          item
        );
      })}

      <Can permission={Permission.USER_READ}>
        <SidebarNavGroup
          label={t('users')}
          icon={AccountIcon}
          // Open when the page being read is inside it: a section that hides the
          // current page behind a closed chevron is worse than no section.
          defaultOpen={USERS_NAV.some(({ href }) => pathname.startsWith(href))}
        >
          {USERS_NAV.map(({ href, key, Icon }) => (
            <SidebarNavItem key={href} href={href} label={t(key)} icon={Icon} />
          ))}
        </SidebarNavGroup>
      </Can>
    </>
  );
}
