import type { CustomOrderDetails } from '@/lib/orders';

export function CustomOrderDetailsSection({ details }: { details: CustomOrderDetails }) {
  return (
    <section className="admin-section">
      <h2 className="admin-section-title">Custom order request</h2>
      <div className="admin-custom-order-grid">
        <p>
          <strong>Gift / bouquet description</strong>
          <br />
          {details.giftDescription}
        </p>
        {details.occasion && (
          <p>
            <strong>Occasion</strong>
            <br />
            {details.occasion}
          </p>
        )}
        {details.deliveryDateLabel && (
          <p>
            <strong>Requested delivery date</strong>
            <br />
            {details.deliveryDateLabel}
          </p>
        )}
        {(details.timePreference || details.timeComments) && (
          <p>
            <strong>Time</strong>
            <br />
            {[details.timePreference, details.timeComments].filter(Boolean).join(' · ')}
          </p>
        )}
        {details.greetingCard && (
          <p>
            <strong>Message card</strong>
            <br />
            {details.greetingCard}
          </p>
        )}
        {details.estimatedBudgetTHB && (
          <p>
            <strong>Estimated budget (THB)</strong>
            <br />
            {details.estimatedBudgetTHB}
          </p>
        )}
        {details.customerComments && (
          <p>
            <strong>Customer notes</strong>
            <br />
            {details.customerComments}
          </p>
        )}
        {details.referenceImageUrl && (
          <p>
            <strong>Reference photo</strong>
            <br />
            <a
              href={details.referenceImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-link"
            >
              {details.referenceImageFilename || 'Open image'}
            </a>
          </p>
        )}
        {!details.referenceImageUrl && details.referenceImageFilename && (
          <p className="admin-muted">
            <strong>Reference photo</strong>
            <br />
            {details.referenceImageFilename} (upload unavailable — ask customer if needed)
          </p>
        )}
      </div>
    </section>
  );
}
