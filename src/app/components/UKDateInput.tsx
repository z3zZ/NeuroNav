import type { ComponentProps } from 'react';
import { isISODate } from '../lib/dates';

export function dateForInput(value: string): string {
  return isISODate(value) ? value.split('-').reverse().join('/') : value;
}

/** Keep storage in ISO, but make entry unambiguous even in US-configured browsers. */
export function UKDateInput({
  value,
  onChange,
  ...props
}: Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type'> & { value: string; onChange: (value: string) => void }) {
  return (
    <input
      {...props}
      type="text"
      placeholder="DD/MM/YYYY"
      value={dateForInput(value)}
      maxLength={10}
      onChange={(e) => {
        const raw = e.target.value;
        const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
        const iso = match ? `${match[3]}-${match[2]}-${match[1]}` : '';
        onChange(isISODate(iso) ? iso : raw);
      }}
    />
  );
}
