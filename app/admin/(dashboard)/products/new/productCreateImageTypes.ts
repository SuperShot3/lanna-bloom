export type AiOptionCount = 1 | 2 | 3;

export type ImageVariant = {
  assetId: string;
  url?: string;
  format: 'webp' | 'png_master';
  isPrimary: boolean;
  alt?: string;
};

export type ImageDraft = {
  id: string;
  file: File;
  localPreview: string;
  variants: ImageVariant[];
  serverPreview?: string;
  isPrimary: boolean;
  enhanced: boolean;
};

export type CandidateKind = 'original' | 'ai';

export type CandidateStatus =
  | 'queued'
  | 'preparing'
  | 'generating'
  | 'ready'
  | 'error';

export type ImageCandidate = {
  id: string;
  kind: CandidateKind;
  aiSlot?: number;
  file: File;
  localPreview: string;
  status: CandidateStatus;
  error?: string;
  variants?: ImageVariant[];
  serverPreview?: string;
  enhanced: boolean;
  selected: boolean;
  isMain: boolean;
};

export type GenerationSession = {
  sourceFile: File;
  sourcePreview: string;
  /** Number of AI alternative slots for this run (`0` = original only). */
  aiOptionCount: AiOptionCount | 0;
  phase: 'configure' | 'generating' | 'select';
  statusLine: string;
  candidates: ImageCandidate[];
};

export function parseVariants(value: unknown): ImageVariant[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): ImageVariant | null => {
      if (!entry || typeof entry !== 'object') return null;
      const row = entry as Record<string, unknown>;
      const assetId = typeof row.assetId === 'string' ? row.assetId : '';
      if (!assetId) return null;
      const format = row.format === 'png_master' ? 'png_master' : 'webp';
      return {
        assetId,
        url: typeof row.url === 'string' ? row.url : undefined,
        format,
        isPrimary: row.isPrimary === true,
        alt: typeof row.alt === 'string' ? row.alt : undefined,
      };
    })
    .filter((variant): variant is ImageVariant => variant != null);
}

export function hasReadyWebp(candidate: {
  status?: CandidateStatus;
  variants?: ImageVariant[];
}): boolean {
  if (candidate.status != null && candidate.status !== 'ready') return false;
  return (candidate.variants ?? []).some((variant) => variant.format === 'webp' && variant.assetId);
}

export function getWebpPreview(candidate: {
  serverPreview?: string;
  localPreview: string;
  variants?: ImageVariant[];
}): string {
  if (candidate.serverPreview) return candidate.serverPreview;
  const webp = (candidate.variants ?? []).find((variant) => variant.format === 'webp');
  if (webp?.url) return webp.url;
  return candidate.localPreview;
}
