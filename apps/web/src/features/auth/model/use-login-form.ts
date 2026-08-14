'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError } from '@/shared/api/http-client';
import { useSession } from './session-provider';

/**
 * Why the sign-in was refused, as a key under `login.*` in the message bundles.
 *
 * A key rather than a sentence, deliberately: this hook decides *what happened*,
 * the component decides *how it reads*. Returning translated text would drag
 * wording into the layer that is supposed to hold none, and would make the hook
 * untestable without a translation provider.
 */
export type LoginErrorKey = 'invalidCredentials' | 'disabled';

/**
 * Everything the sign-in screen does that is not drawing.
 *
 * Extracted for the reason `docs/13-architecture-front.md` gives: there is state
 * to coordinate — two fields, a pending flag, an error and a redirect that must
 * not fire before the session has been rebuilt.
 */
export function useLoginForm() {
  const { user, loading, signIn } = useSession();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<LoginErrorKey | null>(null);
  const [pending, setPending] = useState(false);

  // Somebody already signed in has no business on this page.
  useEffect(() => {
    if (!loading && user) {
      router.replace('/worksites');
    }
  }, [loading, user, router]);

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await signIn(email, password);
      // No `setPending(false)` on success: `signIn` navigates away, and clearing
      // the flag would flash an enabled button over a page that is leaving.
    } catch (caught) {
      // The API answers 401 for both a wrong password and an unknown address,
      // deliberately — collapsing them here keeps that property. Only a disabled
      // account is told apart, because the person cannot fix it by retrying.
      setError(caught instanceof ApiError && caught.status === 403 ? 'disabled' : 'invalidCredentials');
      setPending(false);
    }
  }

  return { email, setEmail, password, setPassword, error, pending, submit };
}
