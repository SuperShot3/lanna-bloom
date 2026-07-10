import type { Locale } from '@/lib/i18n';

export type GuideCommentLabels = {
  title: string;
  hint: string;
  helpful: string;
  helpfulCount: (n: number) => string;
  empty: string;
  name: string;
  email: string;
  emailOptional: string;
  comment: string;
  submit: string;
  submitting: string;
  success: string;
  error: string;
  nameRequired: string;
  commentRequired: string;
};

const LABELS: Record<'en' | 'th', GuideCommentLabels> = {
  en: {
    title: 'Reader comments',
    hint: 'Share a tip or question about this guide. Comments are reviewed before they appear.',
    helpful: 'Helpful',
    helpfulCount: (n: number) => (n === 1 ? '1 person' : `${n} people`),
    empty: 'No comments yet. Be the first to share your thoughts.',
    name: 'Your name',
    email: 'Email',
    emailOptional: 'optional',
    comment: 'Your comment',
    submit: 'Submit comment',
    submitting: 'Submitting…',
    success: 'Thank you — your comment is awaiting review.',
    error: 'Something went wrong. Please try again later.',
    nameRequired: 'Name is required',
    commentRequired: 'Comment is required',
  },
  th: {
    title: 'ความคิดเห็นจากผู้อ่าน',
    hint: 'แชร์เคล็ดลับหรือคำถามเกี่ยวกับบทความนี้ ความคิดเห็นจะแสดงหลังตรวจสอบแล้ว',
    helpful: 'มีประโยชน์',
    helpfulCount: (n: number) => `${n} คน`,
    empty: 'ยังไม่มีความคิดเห็น เป็นคนแรกที่แชร์ความคิดของคุณ',
    name: 'ชื่อของคุณ',
    email: 'อีเมล',
    emailOptional: 'ไม่บังคับ',
    comment: 'ความคิดเห็นของคุณ',
    submit: 'ส่งความคิดเห็น',
    submitting: 'กำลังส่ง…',
    success: 'ขอบคุณ — ความคิดเห็นของคุณรอการตรวจสอบ',
    error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
    nameRequired: 'กรุณากรอกชื่อ',
    commentRequired: 'กรุณากรอกความคิดเห็น',
  },
};

export function getGuideCommentLabels(lang: Locale): GuideCommentLabels {
  return lang === 'th' ? LABELS.th : LABELS.en;
}

/** Serializable strings for server-rendered headings only. */
export function getGuideCommentHeaderStrings(lang: Locale): { title: string; hint: string } {
  const labels = getGuideCommentLabels(lang);
  return { title: labels.title, hint: labels.hint };
}
