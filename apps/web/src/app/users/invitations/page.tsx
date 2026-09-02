import { RequireSession } from '@/features/auth';
import { InvitationListPage } from '@/features/invitations';

/**
 * A route file mounts a screen and holds nothing else — no state, no fetching,
 * no component library. Everything it needs comes through a feature's index.
 *
 * Under `/users/` because that is where the menu puts it: an invitation is a
 * step in the life of an account, not a resource of its own to a reader.
 */
export default function Page() {
  return (
    <RequireSession>
      <InvitationListPage />
    </RequireSession>
  );
}
