'use client';

import { useCallback, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import type { PublicGuideComment } from '@/lib/info/guideComments/read';
import { getOrCreateVisitorToken } from '@/lib/info/visitorToken';
import { getGuideCommentLabels } from './guideCommentLabels';
import styles from './guide-comments.module.css';

const LIKED_KEY = 'lanna-bloom-guide-liked-comments';

function getLikedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(LIKED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id) => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

function markLiked(id: string) {
  try {
    const liked = getLikedIds();
    liked.add(id);
    sessionStorage.setItem(LIKED_KEY, JSON.stringify(Array.from(liked)));
  } catch {
    // ignore
  }
}

function formatDate(dateStr: string, lang: Locale): string {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat(lang === 'th' ? 'th-TH' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

type GuideCommentListProps = {
  comments: PublicGuideComment[];
  lang: Locale;
};

export function GuideCommentList({ comments, lang }: GuideCommentListProps) {
  const labels = getGuideCommentLabels(lang);
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(comments.map((c) => [c.id, c.helpfulCount]))
  );
  const [liked, setLiked] = useState<Set<string>>(() => getLikedIds());
  const [likingId, setLikingId] = useState<string | null>(null);

  const handleLike = useCallback(async (commentId: string) => {
    if (likingId || liked.has(commentId)) return;
    setLikingId(commentId);
    try {
      const res = await fetch(`/api/info/comments/${encodeURIComponent(commentId)}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorToken: getOrCreateVisitorToken() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      if (typeof data.helpfulCount === 'number') {
        setCounts((prev) => ({ ...prev, [commentId]: data.helpfulCount }));
      }
      markLiked(commentId);
      setLiked((prev) => new Set(prev).add(commentId));
    } finally {
      setLikingId(null);
    }
  }, [liked, likingId]);

  if (comments.length === 0) {
    return <p className={styles.guideCommentEmpty}>{labels.empty}</p>;
  }

  return (
    <ul className={styles.guideCommentsList}>
      {comments.map((comment) => {
        const count = counts[comment.id] ?? comment.helpfulCount;
        const isLiked = liked.has(comment.id);
        return (
          <li key={comment.id} className={styles.guideCommentItem}>
            <div className={styles.guideCommentMeta}>
              <p className={styles.guideCommentAuthor}>{comment.authorName}</p>
              <p className={styles.guideCommentDate}>{formatDate(comment.createdAt, lang)}</p>
            </div>
            <p className={styles.guideCommentBody}>{comment.body}</p>
            <button
              type="button"
              className={`${styles.guideCommentHelpfulBtn} ${isLiked ? styles.guideCommentHelpfulBtnActive : ''}`}
              disabled={isLiked || likingId === comment.id}
              onClick={() => handleLike(comment.id)}
              aria-pressed={isLiked}
            >
              {labels.helpful}
              {count > 0 ? ` · ${labels.helpfulCount(count)}` : ''}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
