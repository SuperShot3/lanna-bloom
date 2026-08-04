import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { PartnerNav } from '@/components/partner/PartnerNav';
import { buildPartnerPortalMetadata } from '@/lib/partnerSeo';
import { listPublicProvinces } from '@/lib/provinces/queries';
import { ApplyForm } from './ApplyForm';

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  if (!isValidLocale(params.lang)) return {};
  return buildPartnerPortalMetadata(params.lang as Locale, '/apply');
}

export default async function PartnerApplyPage({
  params,
}: {
  params: { lang: string };
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();

  const provincesResult = await listPublicProvinces();
  const provinces = provincesResult.ok
    ? provincesResult.provinces.map((p) => ({
        code: p.province_code,
        nameEn: p.province_name_en,
        nameTh: p.province_name_th,
      }))
    : [];

  return (
    <div className="partner-page partner-apply-page">
      <PartnerNav lang={lang as Locale} current="apply" />
      <div className="container">
        <ApplyForm lang={lang as Locale} provinces={provinces} />
      </div>
    </div>
  );
}
