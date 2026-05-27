import { redirect } from 'next/navigation';

/** Legacy moderation list — pending items appear in the studio shelf. */
export default function AdminProductsModerationRedirect() {
  redirect('/admin/products?group=pending');
}
