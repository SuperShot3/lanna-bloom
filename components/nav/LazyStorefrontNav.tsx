'use client';

import { useCallback, useEffect, useState, type ComponentType } from 'react';
import type { Locale } from '@/lib/i18n';

function NavChevron() {
  return (
    <svg
      className="size-3.5 opacity-70"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

const DESKTOP_TRIGGER =
  'inline-flex items-center gap-1 uppercase tracking-wide text-[var(--text)] hover:text-[#C5A059] transition-colors outline-none';

type CatalogDesktopProps = {
  lang: Locale;
  catalogHref: string;
  label: string;
  pathActive?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type OccasionsDesktopProps = {
  lang: Locale;
  catalogHref: string;
  label: string;
  onOpenChange?: (open: boolean) => void;
};

type GuidesDesktopProps = {
  lang: Locale;
  infoHref: string;
  label: string;
  pathActive?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type CatalogMobileProps = {
  lang: Locale;
  catalogHref: string;
  label: string;
  pathActive?: boolean;
  onNavigate?: () => void;
};

type OccasionsMobileProps = {
  lang: Locale;
  catalogHref: string;
  label: string;
  onNavigate?: () => void;
};

type GuidesMobileProps = {
  lang: Locale;
  infoHref: string;
  label: string;
  pathActive?: boolean;
  onNavigate?: () => void;
};

function DesktopNavPlaceholder({
  label,
  pathActive,
  onLoad,
}: {
  label: string;
  pathActive?: boolean;
  onLoad: () => void;
}) {
  return (
    <button
      type="button"
      className={`${DESKTOP_TRIGGER}${pathActive ? ' text-[#C5A059]' : ''}`}
      aria-label={label}
      onPointerEnter={onLoad}
      onFocus={onLoad}
      onClick={onLoad}
    >
      <span>{label}</span>
      <NavChevron />
    </button>
  );
}

export function LazyCatalogNavDropdown(props: CatalogDesktopProps) {
  const [Comp, setComp] = useState<ComponentType<CatalogDesktopProps> | null>(null);
  const load = useCallback(() => {
    void import('@/components/CatalogNavDropdown').then((m) => {
      setComp(() => m.CatalogNavDropdown);
    });
  }, []);
  if (Comp) return <Comp {...props} />;
  return (
    <DesktopNavPlaceholder label={props.label} pathActive={props.pathActive} onLoad={load} />
  );
}

export function LazyOccasionsNavDropdown(props: OccasionsDesktopProps) {
  const [Comp, setComp] = useState<ComponentType<OccasionsDesktopProps> | null>(null);
  const load = useCallback(() => {
    void import('@/components/OccasionsNavDropdown').then((m) => {
      setComp(() => m.OccasionsNavDropdown);
    });
  }, []);
  if (Comp) return <Comp {...props} />;
  return <DesktopNavPlaceholder label={props.label} onLoad={load} />;
}

export function LazyGuidesNavDropdown(props: GuidesDesktopProps) {
  const [Comp, setComp] = useState<ComponentType<GuidesDesktopProps> | null>(null);
  const load = useCallback(() => {
    void import('@/components/GuidesNavDropdown').then((m) => {
      setComp(() => m.GuidesNavDropdown);
    });
  }, []);
  if (Comp) return <Comp {...props} />;
  return (
    <DesktopNavPlaceholder label={props.label} pathActive={props.pathActive} onLoad={load} />
  );
}

export function LazyCatalogMobileNav(props: CatalogMobileProps & { loadWhen?: boolean }) {
  const { loadWhen, ...navProps } = props;
  const [Comp, setComp] = useState<ComponentType<CatalogMobileProps> | null>(null);
  useEffect(() => {
    if (!loadWhen || Comp) return;
    void import('@/components/CatalogNavDropdown').then((m) => {
      setComp(() => m.CatalogMobileNav);
    });
  }, [loadWhen, Comp]);
  if (Comp) return <Comp {...navProps} />;
  return <span className="nav-item nav-item--mobile">{navProps.label}</span>;
}

export function LazyOccasionsMobileNav(props: OccasionsMobileProps & { loadWhen?: boolean }) {
  const { loadWhen, ...navProps } = props;
  const [Comp, setComp] = useState<ComponentType<OccasionsMobileProps> | null>(null);
  useEffect(() => {
    if (!loadWhen || Comp) return;
    void import('@/components/OccasionsNavDropdown').then((m) => {
      setComp(() => m.OccasionsMobileNav);
    });
  }, [loadWhen, Comp]);
  if (Comp) return <Comp {...navProps} />;
  return <span className="nav-item nav-item--mobile">{navProps.label}</span>;
}

export function LazyGuidesMobileNav(props: GuidesMobileProps & { loadWhen?: boolean }) {
  const { loadWhen, ...navProps } = props;
  const [Comp, setComp] = useState<ComponentType<GuidesMobileProps> | null>(null);
  useEffect(() => {
    if (!loadWhen || Comp) return;
    void import('@/components/GuidesNavDropdown').then((m) => {
      setComp(() => m.GuidesMobileNav);
    });
  }, [loadWhen, Comp]);
  if (Comp) return <Comp {...navProps} />;
  return <span className="nav-item nav-item--mobile">{navProps.label}</span>;
}
