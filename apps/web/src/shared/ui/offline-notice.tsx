'use client';

import { useTranslations } from 'next-intl';
import { Button } from './button';
import { EmptyState } from './states';

/**
 * "No network" — said plainly, with the one thing to do about it. The service
 * worker also reloads on its own when the connection comes back; the button is
 * for the reader who does not want to wait for it.
 */
export function OfflineNotice() {
  const t = useTranslations('offline');

  return (
    <EmptyState
      title={t('title')}
      description={t('description')}
      action={<Button onClick={() => window.location.reload()}>{t('retry')}</Button>}
    />
  );
}
