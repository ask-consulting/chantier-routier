import { RequireSession } from '@/features/auth';
import { WorkerListPage } from '@/features/workers';

/**
 * A route file mounts a screen and holds nothing else — no state, no
 * fetching, no component library. Everything it needs comes through a
 * feature's index.
 *
 * Top-level, next to `/worksites`, not under `/users/`: a worker is a business
 * resource — someone whose hours cost money — not an account concept. Most
 * workers never appear under "Comptes" at all.
 */
export default function Page() {
  return (
    <RequireSession>
      <WorkerListPage />
    </RequireSession>
  );
}
