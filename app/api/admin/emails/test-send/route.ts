import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
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
} from '@/lib/email/socialFooter';

const MOCK_FOOTER =
  '<p><a href="https://lannabloom.shop">Website</a> · social footer in preview</p>';

function buildMock(base: string): Record<string, string> {
  const b = base.replace(/\/$/, '') || 'https://lannabloom.shop';
  return {
  customer_name: 'Alex',
  customer_email: 'test@example.com',
  order_id: 'order-demo-001',
  order_number: 'order-demo-001',
  product_name: 'Sample bouquet',
  product_image: '',
  delivery_date: '—',
  delivery_address: '—',
  total_price: '฿0',
  review_link: 'https://g.page/r/CclGzPBur8RbEBM/review',
  important_dates_link: `${b}/important-dates?email=test%40example.com&name=Alex&order=order-demo-001`,
  website_url: b,
  instagram_url: 'https://www.instagram.com/lannabloomchiangmai/',
  facebook_url: 'https://www.facebook.com/profile.php?id=61587782069439',
  tiktok_url: '',
  google_maps_url: 'https://g.page/r/CclGzPBur8RbEBM',
  recipient_name: 'Recipient',
  relationship: '',
  occasion_type: 'Birthday',
  days_left: '3',
  recommended_product_name: 'Featured bouquet',
  recommended_product_image: 'https://lannabloom.shop/favicon_io/android-chrome-192x192.png',
  recommended_product_price: '฿0',
  confirm_url: 'https://lannabloom.shop/en/catalog',
  choose_another_url: 'https://lannabloom.shop/en/catalog',
  unsubscribe_url: 'https://lannabloom.shop/reminders/unsubscribe?token=preview',
  brand_header: '',
  logo_url: '',
  social_footer: MOCK_FOOTER,
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(['OWNER', 'MANAGER']);
  if (!auth.ok) return auth.response;
  const to = (auth.session.user.email ?? '').trim();
  if (!to) return NextResponse.json({ error: 'No user email' }, { status: 400 });
  const body = (await request.json()) as { templateKey: string; orderId?: string | null };
  const key = (body.templateKey ?? '').trim();
  if (!key) return NextResponse.json({ error: 'templateKey required' }, { status: 400 });

  const from = process.env.ORDERS_FROM_EMAIL?.trim();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey || !from) {
    return NextResponse.json({ error: 'Resend or from-address not configured' }, { status: 503 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  const { data: tpl, error } = await supabase
    .from('email_templates')
    .select('subject_template, html_template, text_template, template_name')
    .eq('template_key', key)
    .single();
  if (error || !tpl) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

  const base = request.nextUrl.origin || getBaseUrl().replace(/\/$/, '') || 'https://lannabloom.shop';
  const links = getDefaultSocialLinks();
  let vars: Record<string, string> = {
    ...buildMock(base),
    brand_header: getEmailBrandHeaderHtml(links),
    logo_url: getEmailBrandLogoUrl(),
  };
  let loadedOrder = false;
  if (body.orderId) {
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
  const htmlOut = ensureBrandHeaderInHtml(
    rendered.html,
    (tpl as { html_template: string }).html_template,
    brandHeader
  );

  const resend = new Resend(apiKey);
  const { data, error: sendErr } = await resend.emails.send({
    from,
    to: [to],
    subject: `[TEST] ${rendered.subject}`,
    html: htmlOut,
    text: rendered.text || undefined,
  });
  if (sendErr) {
    return NextResponse.json({ error: String(sendErr) }, { status: 502 });
  }
  return NextResponse.json({ ok: true, id: data?.id });
}
