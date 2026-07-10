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
  const { title, hint } = getGuideCommentHeaderStrings(lang);

  return (
    <section className={styles.guideComments} aria-labelledby="guide-comments-heading">
      <h2 id="guide-comments-heading" className={styles.guideCommentsTitle}>
        {title}
      </h2>
      <p className={styles.guideCommentsHint}>{hint}</p>
      <GuideCommentList comments={comments} lang={lang} />
      <GuideCommentForm guideSlug={guideSlug} lang={lang} />
    </section>
  );
}
