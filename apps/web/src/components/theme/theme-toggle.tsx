'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { ThemeDarkIcon, ThemeLightIcon, ThemeSystemIcon } from '@/lib/icons';
import { useTheme, type ThemePreference } from './theme-provider';

const OPTIONS = [
  { value: 'light', labelKey: 'themeLight', Icon: ThemeLightIcon },
  { value: 'system', labelKey: 'themeSystem', Icon: ThemeSystemIcon },
  { value: 'dark', labelKey: 'themeDark', Icon: ThemeDarkIcon },
] as const satisfies readonly {
  value: ThemePreference;
  labelKey: string;
  Icon: typeof ThemeLightIcon;
}[];

/**
 * Three states rather than a switch: "follow the system" is a distinct choice
 * from "always light", and a two-way toggle cannot express it.
 */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const t = useTranslations('settings');

  return (
    <div
      role="radiogroup"
      aria-label={t('theme')}
      className="inline-flex rounded-control border border-border bg-surface-raised p-0.5"
    >
      {OPTIONS.map(({ value, labelKey, Icon }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            // The icons are decorative; this is what a screen reader announces.
            aria-label={t(labelKey)}
            title={t(labelKey)}
            onClick={() => setPreference(value)}
            className={cn(
              'flex size-7 items-center justify-center rounded-[0.25rem] transition-colors',
              active ? 'bg-primary-subtle text-primary-on-subtle' : 'text-fg-subtle hover:text-fg',
            )}
          >
            {/* Was `☀ ◐ ☾` — Unicode characters whose shape and weight depend on
              * whichever font the OS picks, and which sit on the text baseline
              * rather than centring. */}
            <Icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
