import { RequireSession } from '@/features/auth';
import { TaskMaterials } from '@/features/materials';
import { MyWorksitePage } from '@/features/my-worksites';

/**
 * Where two features meet: a worksite's page shows the materials its tasks
 * need, and features do not import each other. The route hands the tab over.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireSession>
      <MyWorksitePage id={id} MaterialsTab={TaskMaterials} />
    </RequireSession>
  );
}
