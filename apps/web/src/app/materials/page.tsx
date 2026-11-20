import { RequireSession } from '@/features/auth';
import { MaterialsPage } from '@/features/materials';

/** A route file mounts a screen and holds nothing else — see `/worksites`. */
export default function Page() {
  return (
    <RequireSession>
      <MaterialsPage />
    </RequireSession>
  );
}
