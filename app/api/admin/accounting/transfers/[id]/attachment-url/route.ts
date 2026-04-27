import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { getAccountingTransferById } from '@/lib/accounting/transfers';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const SIGNED_URL_TTL_SECONDS = 60 * 15;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  if (!id?.trim()) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const transfer = await getAccountingTransferById(id.trim());
  if (!transfer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!transfer.attachment_file_path) {
    return NextResponse.json({ error: 'No attachment found' }, { status: 404 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });

  const { data, error } = await supabase.storage
    .from('proofs')
    .createSignedUrl(transfer.attachment_file_path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error('[transfer-attachment-url] signed URL error:', error?.message);
    return NextResponse.json({ error: 'Failed to generate attachment URL' }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS });
}
