'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BrandIllustration, Logo } from '@/components/brand';
import { useSession } from '@/components/auth/session-provider';
import { Alert, Button, Card, CardBody, Field } from '@/components/ui';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const t = useTranslations('login');
  const { user, loading, signIn } = useSession();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Somebody already signed in has no business on this page.
  useEffect(() => {
    if (!loading && user) {
      router.replace('/worksites');
    }
  }, [loading, user, router]);

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await signIn(email, password);
    } catch (caught) {
      // The API answers 401 for both a wrong password and an unknown address,
      // deliberately — repeating its message verbatim keeps that property.
      setError(
        caught instanceof ApiError && caught.status === 403
          ? t('disabled')
          : t('invalidCredentials'),
      );
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 py-8">
      <Logo size={36} />
      <BrandIllustration size={200} />

      <Card className="w-full">
        <CardBody>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>

            {error && <Alert tone="danger">{error}</Alert>}

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
