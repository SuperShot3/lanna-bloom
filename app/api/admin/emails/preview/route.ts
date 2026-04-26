import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { requireRole } from '@/lib/adminRbac';
import { getBaseUrl, getOrderById } from '@/lib/orders';
import { ensureProductShowcaseForPreview } from '@/lib/email/productShowcaseBlock';
import { renderTemplate } from '@/lib/email/renderTemplate';
import { buildOrderTemplateVariables } from '@/lib/email/variablesFromOrder';
import {
  ensureBrandHeaderInHtml,
  getDefaultSocialLinks,
  getEmailBrandHeaderHtml,
  getEmailBrandLogoUrl,
  getSocialFooterHtml,
} from '@/lib/email/socialFooter';

function buildMock(base: string): Record<string, string> {
  const b = base.replace(/\/$/, '') || 'https://lannabloom.shop';
  return {
  customer_name: 'Alex',
  customer_email: 'you@example.com',
  order_id: 'order-demo-001',
  order_number: 'order-demo-001',
  product_name: 'Sunrise bouquet (M)',
  product_image: `${b}/favicon_io/android-chrome-192x192.png`,
  delivery_date: '2026-04-30 10:00–12:00',
  delivery_address: 'Nimman, Chiang Mai',
  total_price: '฿2,800',
  review_link: 'https://g.page/r/CclGzPBur8RbEBM/review',
  important_dates_link: `${b}/important-dates?email=you%40example.com&name=Alex&order=order-demo-001`,
  website_url: b,
  instagram_url: 'https://www.instagram.com/lannabloomchiangmai/',
  facebook_url: 'https://www.facebook.com/profile.php?id=61587782069439',
  tiktok_url: '',
  google_maps_url: 'https://g.page/r/CclGzPBur8RbEBM',
  recipient_name: 'Jamie',
  relationship: ' (friend)',
  occasion_type: 'Birthday',
  days_left: '7',
  recommended_product_name: '51 Red Roses',
  recommended_product_image: 'https://lannabloom.shop/favicon_io/android-chrome-192x192.png',
  recommended_product_price: '฿1,200 onwards',
  confirm_url: 'https://lannabloom.shop/en/catalog',
  choose_another_url: 'https://lannabloom.shop/en/catalog',
  unsubscribe_url: 'https://lannabloom.shop/reminders/unsubscribe?token=demo',
  brand_header: '',
  logo_url: '',
  social_footer: '',
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(['OWNER', 'MANAGER', 'SUPPORT']);
  if (!auth.ok) return auth.response;
  const body = (await request.json()) as { templateKey: string; orderId?: string | null; useMock?: boolean };
  const key = (body.templateKey ?? '').trim();
  if (!key) return NextResponse.json({ error: 'templateKey required' }, { status: 400 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  const { data: tpl, error } = await supabase
    .from('email_templates')
    .select('subject_template, html_template, text_template, template_key, is_active')
    .eq('template_key', key)
    .single();
  if (error || !tpl) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

  const base = request.nextUrl.origin || getBaseUrl().replace(/\/$/, '') || 'https://lannabloom.shop';
  const links = getDefaultSocialLinks();
  let vars: Record<string, string> = {
    ...buildMock(base),
    social_footer: getSocialFooterHtml(links),
    brand_header: getEmailBrandHeaderHtml(links),
    logo_url: getEmailBrandLogoUrl(),
  };
  let loadedOrder = false;
  if (body.useMock) {
    /* keep mock + footer + brand */
  } else if (body.orderId) {
    const order = await getOrderById(body.orderId.trim());
    if (order) {
      vars = buildOrderTemplateVariables(order);
      loadedOrder = true;
    }
  }
  if (!loadedOrder) {
    ensureProductShowcaseForPreview(key, base, vars);
  }
  const rendered = renderTemplate(tpl.subject_template, tpl.html_template, tpl.text_template, vars);
  const brandHeader = getEmailBrandHeaderHtml(links);
  const html = ensureBrandHeaderInHtml(
    rendered.html,
    tpl.html_template,
    brandHeader
  );
  return NextResponse.json({
    templateKey: tpl.template_key,
    isActive: tpl.is_active,
    subject: rendered.subject,
    html,
    text: rendered.text,
    missingVariables: rendered.missingVariables,
  });
}
