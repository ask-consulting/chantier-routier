import { RequireSession } from '@/features/auth';
import { MyWorksitesPage } from '@/features/my-worksites';

export default function Page() {
  return (
    <RequireSession>
      <MyWorksitesPage />
    </RequireSession>
  );
}
