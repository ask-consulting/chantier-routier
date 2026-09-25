'use client';

import { useTranslations } from 'next-intl';
import type { IClientSummary } from '@chantia/shared';
import { Select } from '@/shared/ui';
import { useClientOptions } from '../api/client.queries';

/**
 * A picker over every client of the organization, for another screen to
 * embed — today the worksite drawer, through its route (features do not
 * import each other; see `eslint.config.mjs`).
 *
 * `current` keeps the value visible even when it is not in the list — a
 * client deleted since, or a list still loading — rather than silently
 * showing "no client" for a worksite that has one.
 */
export function ClientSelect({
  label,
  value,
  onChange,
  error,
  current = null,
}: {
  label: string;
  /** A client id, or `''` for none. */
  value: string;
  onChange: (clientId: string) => void;
  error?: string;
  current?: IClientSummary | null;
}) {
  const t = useTranslations('clients');
  const { data, isPending } = useClientOptions();

  const listed = (data?.items ?? []).map((client) => ({
    value: client.id,
    label: client.displayName,
  }));
  const options = [
    { value: '', label: t('noClientOption') },
    ...(current && !listed.some((option) => option.value === current.id)
      ? [{ value: current.id, label: current.displayName }]
      : []),
    ...listed,
  ];

  return (
    <Select
      label={label}
      options={options}
      value={value}
      disabled={isPending && !current}
      error={error}
      hint={!isPending && listed.length === 0 ? t('noClientYet') : undefined}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
