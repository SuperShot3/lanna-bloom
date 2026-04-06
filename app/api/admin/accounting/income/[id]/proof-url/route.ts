import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { getIncomeRecordById } from '@/lib/accounting/incomeRecords';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const SIGNED_URL_TTL_SECONDS = 60 * 15; // 15 minutes

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  if (!id?.trim()) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const record = await getIncomeRecordById(id.trim());
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!record.proof_file_path) {
    return NextResponse.json({ error: 'No proof file attached' }, { status: 404 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });

  const { data, error } = await supabase.storage
    .from('proofs')
    .createSignedUrl(record.proof_file_path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error('[proof-url] signed URL error:', error?.message);
    return NextResponse.json({ error: 'Failed to generate proof URL' }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS });
}
