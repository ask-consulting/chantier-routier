import { RequireSession } from '@/features/auth';
import { ClientListPage } from '@/features/clients';

/**
 * A route file mounts a screen and holds nothing else — see `/worksites`.
 */
export default function Page() {
  return (
    <RequireSession>
      <ClientListPage />
    </RequireSession>
  );
}
