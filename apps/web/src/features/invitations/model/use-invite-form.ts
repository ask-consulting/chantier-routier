'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Locale, UserRole } from '@chantia/shared';
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

/**
 * Per-field messages are keys under `form.errors.*` — the same namespace the
 * password rules already live in — so any form gets the same two words for
 * "empty" and "not an email" instead of inventing its own.
 */
const inviteSchema = z.object({
  email: z.string().trim().min(1, 'required').email('invalidEmail'),
  firstName: z.string().trim().min(1, 'required'),
  lastName: z.string().trim().min(1, 'required'),
  role: z.nativeEnum(UserRole),
  locale: z.nativeEnum(Locale),
});

export type InviteFormValues = z.infer<typeof inviteSchema>;

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
 * **Two validation layers, deliberately not one.** `isComplete` is the same
 * "is it filled in" check the button always used — synchronous, so the button
 * enables the instant the last field is typed rather than a tick later. The
 * zod schema runs alongside it on every change and is what fills `errors` —
 * shape, not just presence, and only the API can tell address uniqueness apart
 * from either.
 */
export function useInviteForm() {
  const create = useCreateInvitation();
  const {
    register,
    handleSubmit,
    watch,
    reset: resetFields,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    mode: 'onChange',
    defaultValues: EMPTY,
  });

  const values = watch();
  const isComplete =
    values.email.trim().length > 0 &&
    values.firstName.trim().length > 0 &&
    values.lastName.trim().length > 0;

  // The refusal was about what was in the boxes; the moment one changes, it is
  // stale. Leaving it up makes the form look broken while it is being fixed.
  useEffect(() => {
    const subscription = watch(() => create.reset());
    return () => subscription.unsubscribe();
  }, [watch, create]);

  const reset = useCallback(() => {
    resetFields(EMPTY);
    create.reset();
  }, [create, resetFields]);

  const submit = handleSubmit(async (submitted) => {
    // `mutateAsync` rejects on failure; the mutation's own `error` is what the
    // form reads, so the rejection itself has nowhere useful to go.
    await create
      .mutateAsync({
        email: submitted.email.trim(),
        firstName: submitted.firstName.trim(),
        lastName: submitted.lastName.trim(),
        role: submitted.role,
        locale: submitted.locale,
      })
      .catch(() => undefined);
  });

  return {
    register,
    errors,
    reset,
    submit,
    isComplete,
    pending: create.isPending,
    error: create.error ? toErrorKey(create.error) : null,
    /** Non-null once it worked: the account, and the link, shown once. */
    issued: create.data ?? null,
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
