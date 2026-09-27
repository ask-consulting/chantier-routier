import { OfflineNotice } from '@/shared/ui';

/**
 * Shown by the service worker when a page is asked for without a network and
 * was never cached. Precached at install (see `next.config.ts`), so it is
 * there when it is needed — which is precisely when it could not be fetched.
 */
export default function Page() {
  return <OfflineNotice />;
}
