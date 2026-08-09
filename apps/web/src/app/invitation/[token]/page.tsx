import { InvitationForm } from '@/features/auth';

/**
 * The token is the credential, so it travels in the URL and is read here rather
 * than inside the form — a route knows its own params; a component should be
 * given them.
 */
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InvitationForm token={token} />;
}
