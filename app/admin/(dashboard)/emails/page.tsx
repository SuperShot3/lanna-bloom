import { EmailControlCenterClient } from './EmailControlCenterClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Emails & reminders | Admin',
};

export default function AdminEmailsPage() {
  return <EmailControlCenterClient />;
}
