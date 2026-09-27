'use client';

import { useTranslations } from 'next-intl';
import { Select } from '@/shared/ui';
import { useWorksiteOptions } from '../api/worksite.queries';

/**
 * A picker over every worksite of the organization, for another screen to
 * embed — today the equipment planning, through its route (features do not
 * import each other).
 *
 * Every status is offered: a machine may be booked on a site not started yet,
 * and a past stay may need correcting on one already completed.
 */
export function WorksiteSelect({
  label,
  value,
  onChange,
  error,
  disabled = false,
}: {
  label: string;
  /** A worksite id, or `''` for none. */
  value: string;
  onChange: (worksiteId: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  const t = useTranslations('worksites');
  const { data, isPending } = useWorksiteOptions();

  return (
    <Select
      label={label}
      options={[
        { value: '', label: t('pickWorksite') },
        ...(data?.items ?? []).map((worksite) => ({
          value: worksite.id,
          label: `${worksite.code} · ${worksite.name}`,
        })),
      ]}
      value={value}
      disabled={disabled || isPending}
      error={error}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
