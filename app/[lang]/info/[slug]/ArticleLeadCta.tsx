import Link from 'next/link';
import styles from './article.module.css';

type Props = {
  href: string;
  lang: string;
  skipLangPrefix?: boolean;
  hint?: string;
  children: React.ReactNode;
};

export function ArticleLeadCta({
  href,
  lang,
  skipLangPrefix = false,
  hint = 'Takes less than a minute · unsubscribe anytime',
  children,
}: Props) {
  const resolvedHref =
    skipLangPrefix || href.startsWith('http')
      ? href
      : `/${lang}${href.startsWith('/') ? href : `/${href}`}`;
  const isExternal = resolvedHref.startsWith('http');
  const buttonClass = 'btn-premium btn-premium--article-lead';
  const label = <span className={styles.articleLeadCtaLabel}>{children}</span>;

  const button = isExternal ? (
    <a href={resolvedHref} className={buttonClass}>
      {label}
    </a>
  ) : (
    <Link href={resolvedHref} className={buttonClass}>
      {label}
    </Link>
  );

  return (
    <aside className={styles.articleLeadCta} aria-label="Save an important date">
      <p className={styles.articleLeadCtaEyebrow}>Important date reminders</p>
      <div className={styles.articleLeadCtaAction}>{button}</div>
      {hint ? <p className={styles.articleLeadCtaHint}>{hint}</p> : null}
    </aside>
  );
}
