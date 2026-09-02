'use client';

import { useTranslations } from 'next-intl';
import { WorksiteIcon } from '@/shared/lib/icons';
import { SidebarNavItem } from '@/shared/ui';

/**
 * Where the application can go — the one list, rendered by both the desktop rail
 * and the phone drawer. Two lists would drift the first time a section is added
 * to one and not the other.
 *
 * **One entry today.** `messages/*.json` already carries `nav.workers`,
 * `nav.timesheets`, `nav.expenses` and `nav.users`, and `icons.ts` already has
 * their icons — but a link to a route that does not exist is a 404 with a
 * friendly label. Each lands with its screen; adding one here is one line.
 */
export const NAV = [{ href: '/worksites', key: 'worksites', Icon: WorksiteIcon }] as const;

export function NavLinks() {
  const t = useTranslations('nav');

  return NAV.map(({ href, key, Icon }) => (
    <SidebarNavItem key={href} href={href} label={t(key)} icon={Icon} />
  ));
}
