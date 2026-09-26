import { RequireSession } from '@/features/auth';
import { EquipmentListPage } from '@/features/equipment';
import { WorksiteSelect } from '@/features/worksites';

/**
 * A route file mounts a screen and holds nothing else — see `/worksites`.
 *
 * It is also where two features meet: the equipment planning books machines on
 * worksites, and features may not import each other. The route hands the
 * worksite picker over.
 */
export default function Page() {
  return (
    <RequireSession>
      <EquipmentListPage WorksitePicker={WorksiteSelect} />
    </RequireSession>
  );
}
