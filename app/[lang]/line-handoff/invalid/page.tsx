import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n';

export default function LineHandoffInvalidPage({ params }: { params: { lang: string } }) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();

  return (
    <div className="container mx-auto px-4 py-16 max-w-lg text-center">
      <h1 className="text-xl font-semibold text-stone-800 mb-3">Link expired or invalid</h1>
      <p className="text-stone-600 mb-8">
        This cart link is no longer valid. Please return to LINE and ask the assistant to send a new link.
      </p>
      <Link href={`/${lang}/cart`} className="text-[#C5A059] underline font-medium">
        Go to cart
      </Link>
    </div>
  );
}
