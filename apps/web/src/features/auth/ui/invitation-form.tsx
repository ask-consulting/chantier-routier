'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import type { IInvitationPreview } from '@chantia/shared';
import { BrandIllustration, Logo } from '@/shared/brand';
import { Alert, Button, Card, CardBody, Field, Skeleton } from '@/shared/ui';
import { ApiError } from '@/shared/api/http-client';
import { previewInvitation } from '../api/auth.api';
import { useSession } from '../model/session-provider';

/** The minimum length the API enforces — quoted here only to fill the message. */
const MIN_PASSWORD_LENGTH = 10;

/**
 * Where an invitation link lands.
 *
 * Public: the token in the URL is the credential. The preview call is what lets
 * the page greet the person by name and fail early on a dead link, instead of
 * showing an anonymous form that only rejects after a password is typed twice.
 */
export function InvitationForm({ token }: { token: string }) {
  const t = useTranslations('invitation');
  const tErrors = useTranslations('form.errors.password');
  const { acceptInvitation } = useSession();

  const [preview, setPreview] = useState<IInvitationPreview | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    previewInvitation(token).then(setPreview).catch(() => setInvalid(true));
  }, [token]);

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (password !== confirmation) {
      setErrors([t('mismatch')]);
      return;
    }

    setErrors([]);
    setPending(true);
    try {
      await acceptInvitation(token, password);
    } catch (caught) {
      if (caught instanceof ApiError && caught.fields?.length) {
        // The API returns every unmet password rule at once, and each carries an
        // i18n key — so all of them are shown, in the reader's language, rather
        // than one per attempt.
        setErrors(
          caught.fields.map((field) =>
            tErrors(field.code.split('.').pop() ?? 'minLength', { min: MIN_PASSWORD_LENGTH }),
          ),
        );
      } else {
        setErrors([caught instanceof ApiError ? caught.message : t('expired')]);
      }
      setPending(false);
    }
  }

  if (invalid) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 py-8">
        <Logo size={36} />
        <Alert tone="danger">{t('expired')}</Alert>
        <p className="text-center text-sm text-fg-muted">{t('expiredHelp')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 py-8">
      <Logo size={36} />
      <BrandIllustration size={180} />

      <Card className="w-full">
        <CardBody className="flex flex-col gap-4">
          {preview ? (
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                {t('greeting', { firstName: preview.firstName })}
              </h1>
              <p className="mt-1 text-sm text-fg-muted">
                {t('intro', { organization: preview.organizationName })}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
            </div>
          )}

          {errors.length > 0 && (
            <Alert tone="danger">
              <ul className="flex list-inside list-disc flex-col gap-0.5">
                {errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </Alert>
          )}

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Field
              label={t('choosePassword')}
              type="password"
              autoComplete="new-password"
              required
              disabled={!preview}
              hint={t('passwordHint')}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Field
              label={t('confirmPassword')}
              type="password"
              autoComplete="new-password"
              required
              disabled={!preview}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
            <Button type="submit" variant="primary" disabled={pending || !preview}>
              {pending ? t('activating') : t('activate')}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
