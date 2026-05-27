import { redirect } from 'next/navigation';

type PageProps = { params: Promise<{ productId: string }> };

/** Legacy route — product editing is under /admin/products/product. */
export default async function AdminProductEditRedirect({ params }: PageProps) {
  const { productId } = await params;
  redirect(`/admin/products/product/${productId}`);
}
