import { redirect } from 'next/navigation';

export default function ReviewPage() {
  // Public review submissions are disabled. Direct customers to Google reviews page.
  redirect('/en/reviews');
}
