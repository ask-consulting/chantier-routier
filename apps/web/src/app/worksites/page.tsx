import { RequireSession } from '@/features/auth';
import { WorksiteListPage } from '@/features/worksites';

/**
 * A route file mounts a screen. It holds no state, fetches nothing and imports
 * no component library — everything it needs comes through a feature's index.
 *
 * Note there is no barrel over `features/`: importing `@/features` would pull
 * every domain into every route and defeat code splitting. One index per
 * feature, imported by name.
 */
export default function Page() {
  return (
    <RequireSession>
      <WorksiteListPage />
    </RequireSession>
  );
}
