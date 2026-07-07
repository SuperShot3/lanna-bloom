import 'server-only';

/** True when PostgREST/Supabase reports an unknown column on `orders`. */
export function isSupabaseMissingColumnError(
  error: { message?: string; code?: string } | null | undefined,
  column: string,
): boolean {
  if (!error) return false;
  const msg = String(error.message ?? '').toLowerCase();
  const col = column.toLowerCase();
  return (
    error.code === '42703' ||
    msg.includes(`column orders.${col}`) ||
    msg.includes(`column "${col}"`) ||
    msg.includes(`'${col}' column`) ||
    (msg.includes(col) && msg.includes('does not exist'))
  );
}
