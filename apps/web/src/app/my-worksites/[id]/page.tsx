import { RequireSession } from '@/features/auth';
import { MyWorksitePage } from '@/features/my-worksites';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireSession>
      <MyWorksitePage id={id} />
    </RequireSession>
  );
}
