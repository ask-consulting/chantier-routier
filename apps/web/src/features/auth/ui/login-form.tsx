'use client';

import { useTranslations } from 'next-intl';
import { BrandIllustration, Logo } from '@/shared/brand';
import { Alert, Button, Card, CardBody, Field } from '@/shared/ui';
import { useLoginForm } from '../model/use-login-form';

/**
 * The sign-in screen — markup only.
 *
 * Every decision it used to make now lives in `useLoginForm`: what counts as a
 * failure, when to redirect, when the button is busy. What is left is where
 * things sit and how they read, which is the one thing a component should own.
 *
 * The split also makes the wording testable apart from the behaviour: the hook
 * returns `'disabled'`, this file turns it into a sentence in French or Arabic.
 */
export function LoginForm() {
  const t = useTranslations('login');
  const { email, setEmail, password, setPassword, error, pending, submit } = useLoginForm();

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 py-8">
      <Logo size={36} />
      <BrandIllustration size={200} />

      <Card className="w-full">
        <CardBody>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>

            {error && <Alert tone="danger">{t(error)}</Alert>}

            <Field
              label={t('email')}
              type="email"
              name="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Field
              label={t('password')}
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? t('signingIn') : t('signIn')}
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* No "create an account": there is none. Accounts arrive by invitation,
        * and saying so saves somebody hunting for a link that does not exist. */}
      <p className="text-center text-xs text-fg-subtle">{t('noSignUp')}</p>
    </div>
  );
}
