'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { cn } from '@/lib/cn';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/i18n/config';
import { setLocale } from '@/i18n/set-locale';

/**
 * Language picker, in the same shape as the theme toggle.
 *
 * Each language is written in itself — someone looking for Arabic is not
 * necessarily reading the French word for it. Same reason airline sites never
 * write "Japanese".
 */
export function LocaleSwitcher() {
  const current = useLocale() as Locale;
  const t = useTranslations('settings');
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="radiogroup"
      aria-label={t('language')}
      className="inline-flex rounded-control border border-border bg-surface-raised p-0.5"
    >
      {LOCALES.map((locale) => {
        const active = locale === current;
        return (
          <button
            key={locale}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={pending}
            // A server action, because the locale is read server-side to choose
            // the message bundle: it has to be set before the next render.
            onClick={() => startTransition(() => setLocale(locale))}
            className={cn(
              'rounded-[0.25rem] px-2 py-1 text-xs font-medium transition-colors',
              'disabled:opacity-60',
              active ? 'bg-primary-subtle text-primary-on-subtle' : 'text-fg-subtle hover:text-fg',
            )}
          >
            {LOCALE_LABELS[locale]}
          </button>
        );
      })}
    </div>
  );
}
