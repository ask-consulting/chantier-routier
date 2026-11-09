import { RequireSession } from '@/features/auth';
import { ClientContacts, ClientSelect } from '@/features/clients';
import { WorksiteEquipment } from '@/features/equipment';
import { WorksitePlanning } from '@/features/planning';
import { WorksitePage } from '@/features/worksites';

/**
 * One worksite's management page.
 *
 * Where the features meet: the worksite's own page, its planning, the machines
 * booked on it (equipment), and its client's contacts and picker (clients). Features do
 * not import each other; the route hands each piece over.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireSession>
      <WorksitePage
        id={id}
        ClientPicker={ClientSelect}
        Planning={WorksitePlanning}
        Equipment={WorksiteEquipment}
        ClientContacts={ClientContacts}
      />
    </RequireSession>
  );
}
