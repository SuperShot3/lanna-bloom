import { redirect } from 'next/navigation';

type PageProps = { params: Promise<{ bouquetId: string }> };

/** Legacy route — bouquet editing is under /admin/products/bouquet. */
export default async function AdminBouquetReviewRedirect({ params }: PageProps) {
  const { bouquetId } = await params;
  redirect(`/admin/products/bouquet/${bouquetId}`);
}
