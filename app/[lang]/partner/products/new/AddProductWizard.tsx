'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BouquetForm } from '@/app/[lang]/partner/dashboard/[partnerId]/bouquets/BouquetForm';
import { createBouquetAction } from './actions';
import { ProductForm } from './ProductForm';
import { Stepper } from '@/components/partner/Stepper';
import { Card } from '@/components/partner/Card';
import { Chips } from '@/components/partner/Chips';
import { Btn } from '@/components/partner/Btn';
import { translations } from '@/lib/i18n';
import { CATEGORY_OPTIONS } from '@/lib/partnerPortal';
import type { Locale } from '@/lib/i18n';

const ADD_PRODUCT_CATEGORIES = CATEGORY_OPTIONS.map((c) => ({
  value: c.value,
  label: c.labelTh,
  labelEn: c.labelEn,
  icon: c.icon,
}));

type AddProductWizardProps = { lang: Locale; partnerId: string };

export function AddProductWizard({ lang, partnerId }: AddProductWizardProps) {
  const [category, setCategory] = useState<string>('');

  const t = translations[lang].partnerPortal.addProduct;
  const tPartner = translations[lang].partner;

  const categoryOptions = ADD_PRODUCT_CATEGORIES.map((c) => ({
    value: c.value,
    label: lang === 'th' ? c.label : c.labelEn,
    icon: c.icon,
  }));

  if (category === 'flowers') {
    return (
      <>
        <h1 className="partner-add-product-title">{tPartner.addBouquet}</h1>
        <p className="partner-add-product-sub">{tPartner.saveDraft}</p>
        <BouquetForm
          lang={lang}
          partnerId={partnerId}
          action={createBouquetAction}
          submitLabel={tPartner.saveDraft}
          backHref={`/${lang}/partner`}
          backLabel={tPartner.backToDashboard}
        />
      </>
    );
  }

  if (category && ['balloons', 'gifts', 'money_flowers', 'handmade_floral'].includes(category)) {
    return (
      <>
        <h1 className="partner-add-product-title">{t.title}</h1>
        <ProductForm
          lang={lang}
          partnerId={partnerId}
          category={category as 'balloons' | 'gifts' | 'money_flowers' | 'handmade_floral'}
        />
      </>
    );
  }

  return (
    <>
      <h1 className="partner-add-product-title">{t.title}</h1>
      <Stepper steps={[t.stepCategory]} current={0} />
      <Card>
        <div className="partner-add-product-chip-label">{t.stepCategory}</div>
        <Chips
          options={categoryOptions}
          selected={category ? [category] : []}
          onToggle={(v) => setCategory(v)}
          multi={false}
        />
        <div className="partner-add-product-actions">
          <Link href={`/${lang}/partner`}>
            <Btn variant="ghost">{tPartner.backToDashboard}</Btn>
          </Link>
        </div>
      </Card>
    </>
  );
}
