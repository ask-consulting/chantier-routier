import { RequireSession } from '@/features/auth';
import { ActiveWorksites } from '@/features/worksites';

/**
 * The home page: the worksites in progress, as cards, each opening its page.
 * A route file mounts a screen and holds nothing else — see `/worksites`.
 */
export default function Home() {
  return (
    <RequireSession>
      <ActiveWorksites />
    </RequireSession>
  );
}
