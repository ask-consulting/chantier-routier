import { RequireSession } from '@/features/auth';
import { MyWorksitesPage } from '@/features/my-worksites';

/**
 * The home page: « mes chantiers », the worksites in progress the signed-in
 * person works on, each opening its page. A route file mounts a screen and
 * holds nothing else — see `/worksites`.
 */
export default function Home() {
  return (
    <RequireSession>
      <MyWorksitesPage />
    </RequireSession>
  );
}
