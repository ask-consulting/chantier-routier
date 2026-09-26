import { RequireSession } from '@/features/auth';
import { EquipmentListPage } from '@/features/equipment';

/** A route file mounts a screen and holds nothing else — see `/worksites`. */
export default function Page() {
  return (
    <RequireSession>
      <EquipmentListPage />
    </RequireSession>
  );
}
