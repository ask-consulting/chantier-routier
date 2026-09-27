import { RequireSession } from '@/features/auth';
import { ClientContacts, ClientSelect } from '@/features/clients';
import { WorksiteEquipment } from '@/features/equipment';
import { WorksitePage } from '@/features/worksites';

/**
 * One worksite's management page.
 *
 * Where three features meet: the worksite's own page, the machines booked on
 * it (equipment), and its client's contacts and picker (clients). Features do
 * not import each other; the route hands each piece over.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireSession>
      <WorksitePage
        id={id}
        ClientPicker={ClientSelect}
        Equipment={WorksiteEquipment}
        ClientContacts={ClientContacts}
      />
    </RequireSession>
  );
}
