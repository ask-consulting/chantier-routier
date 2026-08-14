'use client';

import { useTranslations } from 'next-intl';
import { Alert, Button, Card, CardBody, Field, Skeleton } from '@/shared/ui';
import { BrandIllustration, Logo } from '@/shared/brand';
import {
  MIN_PASSWORD_LENGTH,
  useInvitationForm,
  type InvitationError,
} from '../model/use-invitation-form';

/**
 * Where an invitation link lands — markup only.
 *
 * The hook decides what failed; this file decides how it reads. That is the
 * whole of the split, and it is what lets the password rules be shown all at
 * once, in the reader's language, without the hook ever holding a sentence.
 */
export function InvitationForm({ token }: { token: string }) {
  const t = useTranslations('invitation');
  const {
    preview,
    invalid,
    password,
    setPassword,
    confirmation,
    setConfirmation,
    errors,
    pending,
    submit,
  } = useInvitationForm(token);

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

          {errors.length > 0 && <ErrorList errors={errors} />}

          <form onSubmit={submit} className="flex flex-col gap-4">
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

/**
 * The refusals, worded.
 *
 * Two namespaces because the two kinds of failure are written in two different
 * places: an unmet password rule is shared with every other password form, a
 * dead link belongs to this screen alone.
 */
function ErrorList({ errors }: { errors: InvitationError[] }) {
  const t = useTranslations('invitation');
  const tRules = useTranslations('form.errors.password');

  return (
    <Alert tone="danger">
      <ul className="flex list-inside list-disc flex-col gap-0.5">
        {errors.map((error) => {
          const text =
            error.kind === 'passwordRule'
              ? tRules(error.code, { min: MIN_PASSWORD_LENGTH })
              : t(error.key);
          return <li key={text}>{text}</li>;
        })}
      </ul>
    </Alert>
  );
}
