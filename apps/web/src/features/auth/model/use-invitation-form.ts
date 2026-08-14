'use client';

import { useEffect, useState } from 'react';
import type { IInvitationPreview } from '@chantia/shared';
import { ApiError } from '@/shared/api/http-client';
import { previewInvitation } from '../api/auth.api';
import { useSession } from './session-provider';

/** The minimum the API enforces. Quoted only to fill the rule message. */
export const MIN_PASSWORD_LENGTH = 10;

/**
 * Why the activation was refused.
 *
 * Two shapes, because the two failures read from different message namespaces:
 *
 *   - `passwordRule` — one unmet rule, keyed under `form.errors.password.*`.
 *     The API returns **all** of them at once, so the person fixes their
 *     password in one attempt instead of discovering the rules one by one.
 *   - `form` — a problem with the form or the link itself, under `invitation.*`.
 *
 * Keys, never sentences: the component owns the wording. That also means a
 * server message in English never leaks onto an Arabic screen — anything we
 * cannot map falls back to `expired`, which is what an unusable link is.
 */
export type InvitationError =
  | { kind: 'passwordRule'; code: string }
  | { kind: 'form'; key: 'mismatch' | 'expired' };

/**
 * Everything the invitation screen does that is not drawing.
 *
 * The preview call is what lets the page greet the person by name and fail early
 * on a dead link, instead of showing an anonymous form that only rejects after a
 * password has been typed twice.
 */
export function useInvitationForm(token: string) {
  const { acceptInvitation } = useSession();

  const [preview, setPreview] = useState<IInvitationPreview | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<InvitationError[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let abandoned = false;
    previewInvitation(token)
      .then((found) => {
        // The token can change between renders; a late answer to a previous one
        // must not overwrite the current preview.
        if (!abandoned) {
          setPreview(found);
        }
      })
      .catch(() => {
        if (!abandoned) {
          setInvalid(true);
        }
      });

    return () => {
      abandoned = true;
    };
  }, [token]);

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (password !== confirmation) {
      setErrors([{ kind: 'form', key: 'mismatch' }]);
      return;
    }

    setErrors([]);
    setPending(true);
    try {
      await acceptInvitation(token, password);
    } catch (caught) {
      setErrors(toErrors(caught));
      setPending(false);
    }
  }

  return {
    preview,
    invalid,
    password,
    setPassword,
    confirmation,
    setConfirmation,
    errors,
    pending,
    submit,
  };
}

function toErrors(caught: unknown): InvitationError[] {
  if (caught instanceof ApiError && caught.fields?.length) {
    return caught.fields.map((field) => ({
      kind: 'passwordRule',
      // The API sends `form.errors.password.minLength`; only the last segment
      // names the rule, and the component knows the namespace it lives in.
      code: field.code.split('.').pop() ?? 'minLength',
    }));
  }
  return [{ kind: 'form', key: 'expired' }];
}
