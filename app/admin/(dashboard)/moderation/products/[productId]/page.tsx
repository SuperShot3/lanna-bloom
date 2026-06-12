import { redirect } from 'next/navigation';

type PageProps = { params: Promise<{ productId: string }> };

/** Legacy route — product detail editing is under /admin/products/product. */
export default async function AdminModerationProductDetailRedirect({ params }: PageProps) {
  const { productId } = await params;
  redirect(`/admin/products/product/${productId}`);
}
