'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Locale, UserRole } from '@chantia/shared';
import { Alert, Button, Drawer, Field, Select, Snippet } from '@/shared/ui';
import { LOCALE_LABELS, LOCALES } from '@/shared/i18n/config';
import { useInviteForm } from '../model/use-invite-form';

/**
 * The form that creates an invitation — and, once it has, the link it produced.
 *
 * **A drawer rather than a centred box.** The list stays visible beside it, so
 * somebody sending a third invitation can see the two already waiting; and a
 * form gets the full height of the screen instead of a box that has to scroll
 * inside itself. A question keeps the centred `ConfirmDialog`: one sentence and
 * an answer should land under the eye, not off to one side.
 *
 * **Two states in one panel, on purpose.** Closing on success and showing the
 * link somewhere else would mean either a second modal or a banner the reader
 * has to find. The link is handed over exactly once by the API — only its hash
 * is stored — so the moment it appears is the only moment it exists.
 *
 * **The link is shown even though the mail has left.** A mail bounces, lands in
 * spam, or reaches somebody who never opens that inbox; an admin standing next
 * to the person can hand the link over directly. Hiding it because "an email was
 * sent" trusts the delivery more than the situation deserves.
 */
export function InviteDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('invitations');
  const tRole = useTranslations('userRole');
  const form = useInviteForm();
  const [copied, setCopied] = useState(false);

  const close = (): void => {
    onClose();
    // After the animation-free close, so the form does not blink back to empty
    // in front of the reader while the panel is still on screen.
    form.reset();
    setCopied(false);
  };

  const invitationUrl = form.issued
    ? `${typeof window === 'undefined' ? '' : window.location.origin}${form.issued.invitationPath}`
    : '';

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setCopied(true);
    } catch {
      // Clipboard access can be refused — an insecure origin, a locked-down
      // browser. The link is on screen and selectable either way, so this is a
      // convenience that fails quietly rather than an action that fails loudly.
      setCopied(false);
    }
  };

  return (
    <Drawer
      open={open}
      size="md"
      title={form.issued ? t('createdTitle') : t('createTitle')}
      closeLabel={t('close')}
      onClose={close}
      busy={form.pending}
      footer={
        form.issued ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={close}>
              {t('done')}
            </Button>
            <Button variant="primary" onClick={() => void copy()}>
              {copied ? t('copied') : t('copyLink')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={close} disabled={form.pending}>
              {t('cancelDismiss')}
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="invite-form"
              loading={form.pending}
              disabled={!form.isComplete}
            >
              {t('send')}
            </Button>
          </div>
        )
      }
    >
      {form.issued ? (
        <div className="flex flex-col gap-stack">
          <Alert tone="success">
            {t('createdDescription', {
              name: `${form.issued.user.firstName} ${form.issued.user.lastName}`,
              email: form.issued.user.email,
            })}
          </Alert>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-fg">{t('linkLabel')}</p>
            <Snippet>{invitationUrl}</Snippet>
            <p className="text-xs text-fg-muted">{t('linkHint')}</p>
          </div>
        </div>
      ) : (
        // The form lives outside the footer, so `form="invite-form"` on the
        // submit button is what ties them — Enter in any field then submits,
        // which is what anybody typing an email address expects.
        <form id="invite-form" onSubmit={(event) => void form.submit(event)} className="flex flex-col gap-stack">
          {form.error && <Alert tone="danger">{t(`error.${form.error}`)}</Alert>}

          <Field
            label={t('email')}
            type="email"
            required
            autoComplete="off"
            value={form.values.email}
            onChange={(event) => form.setValue('email', event.target.value)}
          />

          <div className="grid gap-stack sm:grid-cols-2">
            <Field
              label={t('firstName')}
              required
              value={form.values.firstName}
              onChange={(event) => form.setValue('firstName', event.target.value)}
            />
            <Field
              label={t('lastName')}
              required
              value={form.values.lastName}
              onChange={(event) => form.setValue('lastName', event.target.value)}
            />
          </div>

          <div className="grid gap-stack sm:grid-cols-2">
            <Select
              label={t('role')}
              value={form.values.role}
              onChange={(event) => form.setValue('role', event.target.value as UserRole)}
              options={Object.values(UserRole).map((role) => ({
                value: role,
                label: tRole(role),
              }))}
            />
            <Select
              label={t('locale')}
              // The language of the invitation mail, and of the interface the
              // person will land in — a worker who reads Arabic should not have
              // to find the switcher before understanding the page.
              hint={t('localeHint')}
              value={form.values.locale}
              onChange={(event) => form.setValue('locale', event.target.value as Locale)}
              options={LOCALES.map((locale) => ({
                value: locale,
                label: LOCALE_LABELS[locale],
              }))}
            />
          </div>
        </form>
      )}
    </Drawer>
  );
}
