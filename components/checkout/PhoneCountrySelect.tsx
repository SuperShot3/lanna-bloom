'use client';

import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  countryDialFlag,
  countryDialGroupLabels,
  findCountryByDialCode,
  type CountryCodeEntry,
} from '@/lib/checkout/phoneCountryDial';
import type { Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function PhoneCountrySelect({
  id,
  value,
  onChange,
  popular,
  all,
  lang,
  ariaLabel,
  className = 'co-phone-cc',
  display = 'flag',
}: {
  id?: string;
  value: string;
  onChange: (code: string) => void;
  popular: CountryCodeEntry[];
  all: CountryCodeEntry[];
  lang: Locale;
  ariaLabel: string;
  className?: string;
  /** `flag` shows emoji on the trigger; `full` shows flag + dial code. */
  display?: 'flag' | 'full';
}) {
  const selected = findCountryByDialCode(value, popular, all);
  const { popular: popularLabel, all: allLabel } = countryDialGroupLabels(lang);
  const triggerFlag = selected ? countryDialFlag(selected.label) : '🌐';
  const triggerText =
    display === 'full' ? (selected?.label ?? `+${value}`) : triggerFlag;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="ghost"
          className={cn(
            className,
            'co-phone-cc--flag-only',
            display === 'flag' && 'co-phone-cc--trigger-flag',
            display === 'full' && 'co-phone-cc--trigger-full',
          )}
          aria-label={ariaLabel}
        >
          <span className="co-phone-cc__trigger-text" aria-hidden={display === 'flag'}>
            {triggerText}
          </span>
          <ChevronDown className="co-phone-cc__chevron" size={14} strokeWidth={2} aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="co-phone-cc-menu z-[200] max-h-[min(320px,50vh)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto"
      >
        <DropdownMenuLabel>{popularLabel}</DropdownMenuLabel>
        {popular.map((c) => (
          <CountryMenuItem
            key={c.id}
            entry={c}
            selected={value === c.code}
            onSelect={() => onChange(c.code)}
          />
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{allLabel}</DropdownMenuLabel>
        {all.map((c) => (
          <CountryMenuItem
            key={c.id}
            entry={c}
            selected={value === c.code}
            onSelect={() => onChange(c.code)}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CountryMenuItem({
  entry,
  selected,
  onSelect,
}: {
  entry: CountryCodeEntry;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem
      className={cn('co-phone-cc-menu__item', selected && 'co-phone-cc-menu__item--selected')}
      onSelect={onSelect}
    >
      {entry.label}
    </DropdownMenuItem>
  );
}
