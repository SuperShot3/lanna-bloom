'use client';

type Props = {
  message: string;
  detail?: string;
};

export function AdminImageProcessingBanner({ message, detail }: Props) {
  return (
    <div className="admin-product-create-loading" aria-live="polite">
      <div className="admin-product-create-loader" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div>
        <strong>{message}</strong>
        {detail ? <p>{detail}</p> : null}
      </div>
    </div>
  );
}
