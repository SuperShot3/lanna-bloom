'use client';

type SecTitleProps = {
  th: string;
  en: string;
};

export function SecTitle({ th, en }: SecTitleProps) {
  return (
    <div className="partner-sec-title">
      <div className="partner-sec-title-th">{th}</div>
      <div className="partner-sec-title-en">{en}</div>
    </div>
  );
}
