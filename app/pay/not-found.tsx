import { PAY_LINK_TTL_MINUTES } from '@/lib/payLinks/adminPayLink';
import { PayLinkFallback } from '@/components/pay/PayLinkFallback';

export default function PayLinkNotFound() {
  return (
    <PayLinkFallback
      title="This payment link is no longer active"
      hint={`Pay links can be used once, and only for ${PAY_LINK_TTL_MINUTES} minutes. Ask Lanna Bloom to send a new link if you still need to pay.`}
    />
  );
}
