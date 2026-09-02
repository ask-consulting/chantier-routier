'use client';

import { useCallback, useState } from 'react';
import { Locale, UserRole, type IInvitation } from '@chantia/shared';
import { ApiError } from '@/shared/api/http-client';
import { useCreateInvitation } from '../api/invitation.queries';

/**
 * Why an invitation was refused, as a key under `invitations.*`.
 *
 * A key rather than a sentence, like `use-login-form`: the hook decides *what
 * happened*, the component decides *how it reads*. Returning translated text
 * would drag wording into a layer meant to hold none — and would make this
 * untestable without a translation provider.
 */
export type InviteErrorKey = 'emailAlreadyUsed' | 'invalidInput' | 'unknown';

export interface InviteFormValues {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  locale: Locale;
}

const EMPTY: InviteFormValues = {
  email: '',
  firstName: '',
  lastName: '',
  // The role the product has most of, and the least dangerous to get wrong: an
  // admin created by a slip of the wheel is a security problem, a worker is not.
  role: UserRole.WORKER,
  locale: Locale.FRENCH,
};

/**
 * The invite form's state, its submission, and what comes back.
 *
 * **The link is kept after success**, because the API hands it over exactly
 * once — only its hash is stored. The mail is on its way, but a mail can bounce
 * or land in spam, and an admin standing next to the person is entitled to pass
 * the link on directly. Losing it silently would be losing the one copy.
 *
 * **Client-side validation stops at "is it filled in".** The real rules —
 * address shape, uniqueness across the product — live in the API, which is the
 * only place that can answer the second one at all. Duplicating the first would
 * mean two regexes with one of them wrong.
 */
export function useInviteForm() {
  const [values, setValues] = useState<InviteFormValues>(EMPTY);
  const [error, setError] = useState<InviteErrorKey | null>(null);
  const [issued, setIssued] = useState<IInvitation | null>(null);
  const create = useCreateInvitation();

  const setValue = useCallback(<K extends keyof InviteFormValues>(
    field: K,
    value: InviteFormValues[K],
  ) => {
    setValues((previous) => ({ ...previous, [field]: value }));
    // The refusal was about what was in the boxes; the moment one changes, it is
    // stale. Leaving it up makes the form look broken while it is being fixed.
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setValues(EMPTY);
    setError(null);
    setIssued(null);
    create.reset();
  }, [create]);

  const isComplete =
    values.email.trim().length > 0 &&
    values.firstName.trim().length > 0 &&
    values.lastName.trim().length > 0;

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!isComplete || create.isPending) {
      return;
    }
    setError(null);

    try {
      const invitation = await create.mutateAsync({
        email: values.email.trim(),
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        role: values.role,
        locale: values.locale,
      });
      setIssued(invitation);
    } catch (caught) {
      setError(toErrorKey(caught));
    }
  }

  return {
    values,
    setValue,
    reset,
    submit,
    isComplete,
    pending: create.isPending,
    error,
    /** Non-null once it worked: the account, and the link, shown once. */
    issued,
  };
}

function toErrorKey(caught: unknown): InviteErrorKey {
  if (!(caught instanceof ApiError)) {
    return 'unknown';
  }
  // 409 is the one an admin can act on — the address already belongs to an
  // account, here or in another organization, and the API deliberately does not
  // say which. Everything else is either a typo (400) or not their problem.
  if (caught.status === 409) {
    return 'emailAlreadyUsed';
  }
  return caught.status === 400 ? 'invalidInput' : 'unknown';
}
