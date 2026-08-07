'use client';

import { cn } from '@/lib/cn';
import { useTheme, type ThemePreference } from './theme-provider';

const OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: 'light', label: 'Thème clair', icon: '☀' },
  { value: 'system', label: 'Thème système', icon: '◐' },
  { value: 'dark', label: 'Thème sombre', icon: '☾' },
];

/**
 * Three states rather than a switch: "follow the system" is a distinct choice
 * from "always light", and a two-way toggle cannot express it.
 */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Thème"
      className="inline-flex rounded-control border border-border bg-surface-raised p-0.5"
    >
      {OPTIONS.map((option) => {
        const active = preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            // The icons are decorative; this is what a screen reader announces.
            aria-label={option.label}
            title={option.label}
            onClick={() => setPreference(option.value)}
            className={cn(
              'flex size-7 items-center justify-center rounded-[0.25rem] text-sm transition-colors',
              active
                ? 'bg-primary-subtle text-primary-on-subtle'
                : 'text-fg-subtle hover:text-fg',
            )}
          >
            <span aria-hidden>{option.icon}</span>
          </button>
        );
      })}
    </div>
  );
}
