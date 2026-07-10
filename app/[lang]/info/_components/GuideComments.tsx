import type { Locale } from '@/lib/i18n';
import { getApprovedGuideComments } from '@/lib/info/guideComments/read';
import { GuideCommentForm } from './GuideCommentForm';
import { GuideCommentList } from './GuideCommentList';
import { getGuideCommentHeaderStrings } from './guideCommentLabels';
import styles from './guide-comments.module.css';

type GuideCommentsProps = {
  guideSlug: string;
  lang: Locale;
};

export async function GuideComments({ guideSlug, lang }: GuideCommentsProps) {
  const comments = await getApprovedGuideComments(guideSlug);
  const { eyebrow, title, hint } = getGuideCommentHeaderStrings(lang);

  return (
    <section className={styles.guideComments} aria-labelledby="guide-comments-heading">
      <header className={styles.guideCommentsHeader}>
        <p className={styles.guideCommentsEyebrow}>{eyebrow}</p>
        <div className={styles.guideCommentsTitleRow}>
          <h2 id="guide-comments-heading" className={styles.guideCommentsTitle}>
            {title}
          </h2>
          {comments.length > 0 && (
            <span className={styles.guideCommentsCount} aria-hidden>
              {comments.length}
            </span>
          )}
        </div>
        <p className={styles.guideCommentsHint}>{hint}</p>
      </header>

      <div className={styles.guideCommentsPanel}>
        <GuideCommentList comments={comments} lang={lang} />
        <GuideCommentForm guideSlug={guideSlug} lang={lang} />
      </div>
    </section>
  );
}
