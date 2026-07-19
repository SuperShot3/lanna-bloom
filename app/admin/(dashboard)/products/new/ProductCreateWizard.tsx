'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BOUQUET_PRESENTATION_FORMAT_OPTIONS } from '@/lib/bouquetPresentationFormats';
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABEL, type ProductCategory } from '@/lib/catalogCategories';
import {
  DELIVERY_DESTINATIONS,
  destinationDisplayName,
  type DeliveryDestinationId,
} from '@/lib/delivery/markets';
import {
  DEFAULT_BASE_PRODUCT_PRESERVATION_PROMPT,
  DEFAULT_PRODUCT_IMAGE_ENHANCEMENT_RULES,
  DEFAULT_SAFE_PRESENTATION_PRESETS,
  type SafePresentationPresetKey,
} from '@/lib/adminProductAiRules';
import { AdminCheckboxGrid, AdminImageCropModal } from '@/app/admin/components/cms-editor';
import {
  ADMIN_COLOR_OPTIONS,
  ADMIN_DELIVERY_SPEED_OPTIONS,
  ADMIN_FLOWER_TYPE_OPTIONS,
  ADMIN_OCCASION_OPTIONS,
  ADMIN_PRICING_TYPE_OPTIONS,
} from '@/lib/catalogAdminFieldOptions';
import type { PricingType } from '@/lib/catalog/pricing';
import { useToast } from '@/contexts/ToastContext';
import { ProductCreateImagesStep } from './ProductCreateImagesStep';
import {
  type AiOptionCount,
  type GenerationSession,
  type ImageCandidate,
  type ImageDraft,
  type ImageVariant,
  hasReadyWebp,
  parseVariants,
} from './productCreateImageTypes';

function isCandidateInFlight(candidate: ImageCandidate): boolean {
  return (
    candidate.status === 'preparing' ||
    candidate.status === 'generating' ||
    candidate.status === 'queued'
  );
}

type ProductImageAnalysis = {
  productFormat: string;
  identifiedFlowers: string[];
  colors: string[];
  greenery: string[];
  wrappingOrContainer: string;
  arrangementStyle: string;
  suggestedOccasions: string[];
  confidenceNotes: string;
  uncertainItems: string[];
  rawSummary: string;
};

type ProductDraftCopy = {
  nameEn: string;
  nameTh: string;
  descriptionEn: string;
  descriptionTh: string;
  compositionEn: string;
  compositionTh: string;
  altEn: string;
  altTh: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  searchPhrases: string[];
};

type ImageDraftWithAnalysis = ImageDraft & {
  analysis?: ProductImageAnalysis;
};

type SavedProduct = {
  id: string;
  slug: string;
  reviewUrl: string;
};

type Hints = {
  itemCategory: 'flowers' | ProductCategory;
  productType: string;
  occasion: string;
  colors: string;
  price: string;
  size: string;
  notes: string;
};

type TextGenerationHistoryEntry = {
  id: string;
  nameEn: string;
  nameTh: string;
  generatedAt: string;
  account: string;
};

type WizardStep = 'images' | 'text' | 'review';

type LoadingState =
  | { kind: 'images' }
  | { kind: 'draft' }
  | { kind: 'publish' }
  | null;

const TEXT_GENERATION_HISTORY_KEY = 'admin-product-text-generation-history';
const TEXT_GENERATION_HISTORY_LIMIT = 12;

const emptyDraft: ProductDraftCopy = {
  nameEn: '',
  nameTh: '',
  descriptionEn: '',
  descriptionTh: '',
  compositionEn: '',
  compositionTh: '',
  altEn: '',
  altTh: '',
  seoTitle: '',
  seoDescription: '',
  seoKeywords: [],
  searchPhrases: [],
};

const emptyHints: Hints = {
  itemCategory: 'flowers',
  productType: 'bouquet',
  occasion: '',
  colors: '',
  price: '',
  size: '',
  notes: '',
};

const stepOrder: WizardStep[] = ['images', 'text', 'review'];

const stepCopy: Record<WizardStep, { eyebrow: string; label: string; description: string }> = {
  images: {
    eyebrow: 'Step 1',
    label: 'Images',
    description:
      'Upload a photo to use as the product image, then continue to text. AI image alternatives are optional.',
  },
  text: {
    eyebrow: 'Step 2',
    label: 'Text',
    description: 'Use the main product image to generate bilingual copy you can edit before saving.',
  },
  review: {
    eyebrow: 'Step 3',
    label: 'Review & save',
    description: 'Confirm price, tags, markets, and save the product for owner/admin review.',
  },
};

const adminItemCategoryOptions: Array<{ value: Hints['itemCategory']; label: string }> = [
  { value: 'flowers', label: 'Flowers' },
  ...PRODUCT_CATEGORIES.map((value) => ({
    value,
    label: String(PRODUCT_CATEGORY_LABEL[value] ?? value),
  })),
];

const deliveryDestinationOptions: Array<{ value: DeliveryDestinationId; label: string }> =
  DELIVERY_DESTINATIONS.map((value) => ({
    value,
    label: destinationDisplayName(value, 'en'),
  }));

function normalizeAdminItemCategory(value: string): Hints['itemCategory'] {
  if (value === 'flowers') return 'flowers';
  if (PRODUCT_CATEGORIES.includes(value as ProductCategory)) return value as ProductCategory;
  return 'flowers';
}

function getAdminItemCategoryLabel(value: Hints['itemCategory']): string {
  return adminItemCategoryOptions.find((option) => option.value === value)?.label ?? value;
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase().replace(/\s+/g, '_'))
    .filter(Boolean);
}

function joinList(value: string[] | undefined): string {
  return (value ?? []).join(', ');
}

function isTextGenerationHistoryEntry(value: unknown): value is TextGenerationHistoryEntry {
  const entry = value as Partial<TextGenerationHistoryEntry>;
  return (
    typeof entry?.id === 'string' &&
    typeof entry.nameEn === 'string' &&
    typeof entry.nameTh === 'string' &&
    typeof entry.generatedAt === 'string' &&
    typeof entry.account === 'string'
  );
}

function readTextGenerationHistory(): TextGenerationHistoryEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(TEXT_GENERATION_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter(isTextGenerationHistoryEntry).slice(0, TEXT_GENERATION_HISTORY_LIMIT)
      : [];
  } catch {
    return [];
  }
}

function saveTextGenerationHistory(history: TextGenerationHistoryEntry[]) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(TEXT_GENERATION_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // History is helpful, but product creation should continue if browser storage is unavailable.
  }
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatGeneratedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function presentationFormatFromAnalysis(analysis: ProductImageAnalysis | null): string {
  const text = `${analysis?.productFormat ?? ''} ${analysis?.wrappingOrContainer ?? ''}`.toLowerCase();
  if (text.includes('basket')) return 'basket';
  if (text.includes('vase')) return 'vase';
  if (text.includes('box')) return 'box';
  if (text.includes('pot') || text.includes('potted')) return 'potted';
  if (text.includes('arrangement')) return 'arrangement';
  return 'bouquet';
}

function hasPositivePrice(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) return false;

  const numericPrice = Number(normalized);
  return Number.isFinite(numericPrice) && numericPrice > 0;
}

async function readJsonResponse(response: Response): Promise<Record<string, unknown>> {
  try {
    const json = await response.json();
    return json && typeof json === 'object' ? (json as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function ProductCreateWizard({ adminEmail }: { adminEmail: string }) {
  const { showToast } = useToast();
  const [activeStep, setActiveStep] = useState<WizardStep>('images');
  const [imageDrafts, setImageDrafts] = useState<ImageDraftWithAnalysis[]>([]);
  const [generationSession, setGenerationSession] = useState<GenerationSession | null>(null);
  const [optionalAiSource, setOptionalAiSource] = useState<{ file: File; preview: string } | null>(
    null
  );
  const [aiOptionCount, setAiOptionCount] = useState<AiOptionCount>(2);
  const [imageStatusLine, setImageStatusLine] = useState('');
  const [isPreparingOriginal, setIsPreparingOriginal] = useState(false);
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);
  const [basePreservationPrompt, setBasePreservationPrompt] = useState<string>(
    DEFAULT_BASE_PRODUCT_PRESERVATION_PROMPT
  );
  const [presentationPresets, setPresentationPresets] = useState<Record<SafePresentationPresetKey, string>>(
    () => ({ ...DEFAULT_SAFE_PRESENTATION_PRESETS })
  );
  const [showRules, setShowRules] = useState(false);

  const [hints, setHints] = useState<Hints>(emptyHints);
  const [analysis, setAnalysis] = useState<ProductImageAnalysis | null>(null);
  const [draft, setDraft] = useState<ProductDraftCopy>(emptyDraft);

  const [price, setPrice] = useState('');
  const [colorTags, setColorTags] = useState<string[]>([]);
  const [flowerTypes, setFlowerTypes] = useState<string[]>([]);
  const [occasionTags, setOccasionTags] = useState<string[]>([]);
  const [presentationCsv, setPresentationCsv] = useState('bouquet');
  const [deliveryOptions, setDeliveryOptions] = useState<string[]>(['same_day', 'next_day']);
  const [availableDeliveryDestinations, setAvailableDeliveryDestinations] = useState<DeliveryDestinationId[]>([
    ...DELIVERY_DESTINATIONS,
  ]);
  const [featuredPopular, setFeaturedPopular] = useState(false);
  const [pricingType, setPricingType] = useState<PricingType>('single_price');

  const [loading, setLoading] = useState<LoadingState>(null);
  const [error, setError] = useState('');
  const [savedProduct, setSavedProduct] = useState<SavedProduct | null>(null);
  const [textGenerationHistory, setTextGenerationHistory] = useState<TextGenerationHistoryEntry[]>([]);

  const primaryDraft = useMemo(() => imageDrafts.find((d) => d.isPrimary), [imageDrafts]);
  const readyDrafts = imageDrafts.filter((d) => hasReadyWebp(d));
  const hasPrimaryReady = readyDrafts.some((d) => d.isPrimary);
  const isImageGenerationInFlight = Boolean(
    generationSession?.candidates.some((candidate) => isCandidateInFlight(candidate))
  );

  const stepCompletion: Record<WizardStep, boolean> = {
    images: hasPrimaryReady,
    text: Boolean(draft.nameEn.trim()),
    review: Boolean(savedProduct),
  };

  const canSaveForReview = useMemo(
    () => Boolean(draft.nameEn.trim() && hasPositivePrice(price) && hasPrimaryReady),
    [draft.nameEn, price, hasPrimaryReady]
  );

  const canContinueFromImages = useMemo(() => {
    // Default path: original photo already attached to the gallery.
    const draftsReady =
      hasPrimaryReady && imageDrafts.length > 0 && imageDrafts.every((row) => hasReadyWebp(row));
    if (draftsReady) return true;

    // Optional AI path: a selected ready candidate can also unlock continue.
    return Boolean(
      generationSession?.candidates.some(
        (candidate) => candidate.selected && hasReadyWebp(candidate)
      )
    );
  }, [generationSession, hasPrimaryReady, imageDrafts]);

  const occasionHintValues = useMemo(() => splitList(hints.occasion), [hints.occasion]);
  const colorHintValues = useMemo(() => splitList(hints.colors), [hints.colors]);
  const isFlowerProduct = hints.itemCategory === 'flowers';
  const itemCategoryLabel = getAdminItemCategoryLabel(hints.itemCategory);

  const activeStepRef = useRef(activeStep);
  const notifiedReadyCandidateIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    activeStepRef.current = activeStep;
  }, [activeStep]);

  useEffect(() => {
    setTextGenerationHistory(readTextGenerationHistory());
  }, []);

  useEffect(() => {
    return () => {
      imageDrafts.forEach((d) => {
        try {
          URL.revokeObjectURL(d.localPreview);
        } catch {
          // ignore
        }
      });
    };
    // We only want this on unmount; the drafts are immutable file refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const candidates = generationSession?.candidates ?? [];
    candidates.forEach((candidate) => {
      if (candidate.kind !== 'ai' || candidate.status !== 'ready' || !hasReadyWebp(candidate)) return;
      if (notifiedReadyCandidateIdsRef.current.has(candidate.id)) return;
      notifiedReadyCandidateIdsRef.current.add(candidate.id);
      if (activeStepRef.current !== 'images') {
        const slotLabel = candidate.aiSlot != null ? ` ${candidate.aiSlot}` : '';
        showToast(`AI option${slotLabel} is ready. Open Images to add it to the gallery.`);
      }
    });
  }, [generationSession, showToast]);

  function updateHint(key: keyof Hints, value: string) {
    setHints((current) => ({ ...current, [key]: value }));
  }

  function setColorHints(values: string[]) {
    updateHint('colors', values.join(', '));
  }

  function setOccasionHints(values: string[]) {
    updateHint('occasion', values.join(', '));
  }

  function toggleAvailableDeliveryDestination(value: DeliveryDestinationId) {
    setAvailableDeliveryDestinations((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
    setSavedProduct(null);
  }

  function updateProductType(value: string) {
    updateHint('productType', value);
    setPresentationCsv(value);
  }

  function updateItemCategory(value: string) {
    const nextCategory = normalizeAdminItemCategory(value);
    setHints((current) => ({
      ...current,
      itemCategory: nextCategory,
      productType: nextCategory === 'flowers' ? current.productType || 'bouquet' : nextCategory,
    }));
    if (nextCategory !== 'flowers') {
      setPresentationCsv('');
      setFlowerTypes([]);
      setColorTags([]);
      setFeaturedPopular(false);
    } else if (!presentationCsv) {
      setPresentationCsv('bouquet');
    }
    setSavedProduct(null);
  }

  function updateDraft(key: keyof ProductDraftCopy, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateAnalysis(key: keyof ProductImageAnalysis, value: string) {
    if (!analysis) return;
    const listFields: Array<keyof ProductImageAnalysis> = [
      'identifiedFlowers',
      'colors',
      'greenery',
      'suggestedOccasions',
      'uncertainItems',
    ];
    setAnalysis({
      ...analysis,
      [key]: listFields.includes(key) ? splitList(value) : value,
    });
  }

  function recordTextGeneration(nextDraft: ProductDraftCopy) {
    const entry: TextGenerationHistoryEntry = {
      id: createId(),
      nameEn: nextDraft.nameEn || 'Untitled product',
      nameTh: nextDraft.nameTh,
      generatedAt: new Date().toISOString(),
      account: adminEmail || 'Unknown account',
    };

    setTextGenerationHistory((current) => {
      const next = [entry, ...current].slice(0, TEXT_GENERATION_HISTORY_LIMIT);
      saveTextGenerationHistory(next);
      return next;
    });
  }

  function setPrimary(imageId: string) {
    setImageDrafts((current) =>
      current.map((d) => ({ ...d, isPrimary: d.id === imageId }))
    );
    setSavedProduct(null);
  }

  function removeDraft(imageId: string) {
    setImageDrafts((current) => {
      const target = current.find((d) => d.id === imageId);
      if (target) {
        try {
          URL.revokeObjectURL(target.localPreview);
        } catch {
          // ignore
        }
      }
      const next = current.filter((d) => d.id !== imageId);
      // Ensure exactly one primary remains if any are ready.
      const hasPrimary = next.some((d) => d.isPrimary);
      if (!hasPrimary && next.length) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return next;
    });
    setSavedProduct(null);
  }

  function handleNewFileSelected(file: File | null) {
    if (!file) return;
    setPendingCropFile(file);
  }

  function clearOptionalAiSource() {
    if (optionalAiSource?.preview) {
      try {
        URL.revokeObjectURL(optionalAiSource.preview);
      } catch {
        // ignore
      }
    }
    setOptionalAiSource(null);
  }

  function cancelGenerationSession() {
    if (generationSession?.sourcePreview) {
      const sharedWithOptional =
        optionalAiSource?.preview && generationSession.sourcePreview === optionalAiSource.preview;
      if (!sharedWithOptional) {
        try {
          URL.revokeObjectURL(generationSession.sourcePreview);
        } catch {
          // ignore
        }
      }
    }
    setGenerationSession(null);
    setImageStatusLine('');
  }

  async function attachOriginalAsProductImage(file: File) {
    setPendingCropFile(null);
    setError('');
    setSavedProduct(null);

    if (generationSession?.phase === 'select') {
      const hasSelected = generationSession.candidates.some(
        (candidate) => candidate.selected && hasReadyWebp(candidate)
      );
      if (hasSelected) commitSelectedCandidates();
    }
    cancelGenerationSession();
    clearOptionalAiSource();

    const localPreview = URL.createObjectURL(file);
    setOptionalAiSource({ file, preview: localPreview });
    setIsPreparingOriginal(true);
    setImageStatusLine('Preparing original photo…');

    try {
      const alt = draft.altEn || draft.nameEn || file.name;
      const result = await prepareCandidateFile(file, alt);
      if ('error' in result) {
        showToast(result.error || 'Failed to prepare the original photo.', { variant: 'error' });
        setError(result.error || 'Failed to prepare the original photo.');
        setImageStatusLine('');
        return;
      }

      setImageDrafts((current) => {
        const next = current.map((row) => ({ ...row, isPrimary: false }));
        next.push({
          id: createId(),
          file,
          localPreview: result.serverPreview ?? localPreview,
          variants: result.variants,
          serverPreview: result.serverPreview,
          isPrimary: true,
          enhanced: false,
        });
        return next;
      });
      setImageStatusLine('');
      showToast('Original photo added as the product image. You can generate text next.');
    } catch {
      showToast('Could not prepare the original photo. Check your connection and try again.', {
        variant: 'error',
      });
      setError('Could not prepare the original photo. Check your connection and try again.');
      setImageStatusLine('');
    } finally {
      setIsPreparingOriginal(false);
    }
  }

  function applyPendingCrop(file: File) {
    void attachOriginalAsProductImage(file);
  }

  function skipPendingCrop() {
    if (!pendingCropFile) return;
    void attachOriginalAsProductImage(pendingCropFile);
  }

  function updateSessionCandidates(
    updater: (candidates: ImageCandidate[]) => ImageCandidate[]
  ) {
    setGenerationSession((current) => {
      if (!current) return current;
      const candidates = updater(current.candidates);
      const allSettled = candidates.every(
        (candidate) => candidate.status === 'ready' || candidate.status === 'error'
      );
      const anyInFlight = candidates.some(
        (candidate) =>
          candidate.status === 'preparing' ||
          candidate.status === 'generating' ||
          candidate.status === 'queued'
      );
      return {
        ...current,
        candidates,
        phase: allSettled && !anyInFlight ? 'select' : current.phase === 'configure' ? 'generating' : current.phase,
        statusLine: current.statusLine,
      };
    });
  }

  function refreshImageStatusLine(candidates: ImageCandidate[], aiTotal: number) {
    const original = candidates.find((candidate) => candidate.kind === 'original');
    if (original?.status === 'preparing') {
      setImageStatusLine('Preparing original photo...');
      return;
    }
    const generatingAi = candidates.find(
      (candidate) => candidate.kind === 'ai' && candidate.status === 'generating'
    );
    if (generatingAi?.aiSlot) {
      setImageStatusLine(`Creating AI option ${generatingAi.aiSlot} of ${aiTotal}...`);
      return;
    }
    const optimizing = candidates.find(
      (candidate) =>
        (candidate.status === 'preparing' || candidate.status === 'generating') && candidate.kind === 'ai'
    );
    if (optimizing) {
      setImageStatusLine('Optimizing for website...');
      return;
    }
    const allSettled = candidates.every(
      (candidate) => candidate.status === 'ready' || candidate.status === 'error'
    );
    if (allSettled) {
      setImageStatusLine('Ready');
      return;
    }
    setImageStatusLine('Optimizing for website...');
  }

  async function prepareCandidateFile(
    file: File,
    alt: string
  ): Promise<{ variants: ImageVariant[]; serverPreview?: string } | { error: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('alt', alt);
    const response = await fetch('/api/admin/products/prepare-image', { method: 'POST', body: formData });
    const payload = await readJsonResponse(response);
    if (!response.ok) {
      return { error: String(payload.error ?? 'Failed to prepare image.') };
    }
    const previews = payload.previews as { webp?: string } | undefined;
    return {
      variants: parseVariants(payload.variants),
      serverPreview: previews?.webp,
    };
  }

  async function enhanceCandidateFile(
    file: File,
    alt: string,
    prompt: { basePrompt: string; presentationPreset: string },
    approvedAnalysis?: ProductImageAnalysis | null
  ): Promise<{ variants: ImageVariant[]; serverPreview?: string } | { error: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('alt', alt);
    formData.append('basePrompt', prompt.basePrompt);
    formData.append('presentationPreset', prompt.presentationPreset);
    if (approvedAnalysis) {
      formData.append('approvedAnalysis', JSON.stringify(approvedAnalysis));
    } else if (analysis) {
      formData.append('approvedAnalysis', JSON.stringify(analysis));
    }
    const response = await fetch('/api/admin/products/enhance-image', { method: 'POST', body: formData });
    const payload = await readJsonResponse(response);
    if (!response.ok) {
      return { error: String(payload.error ?? 'Failed to create AI image.') };
    }
    const previews = payload.previews as { webp?: string } | undefined;
    return {
      variants: parseVariants(payload.variants),
      serverPreview: previews?.webp,
    };
  }

  function buildAiOnlyCandidates(count: AiOptionCount, source: GenerationSession): ImageCandidate[] {
    return Array.from({ length: count }, (_, index) => ({
      id: createId(),
      kind: 'ai' as const,
      aiSlot: index + 1,
      file: source.sourceFile,
      localPreview: source.sourcePreview,
      status: 'generating' as const,
      enhanced: true,
      selected: false,
      isMain: false,
    }));
  }

  async function runCandidatePrepare(candidateId: string, source: GenerationSession) {
    const alt = draft.altEn || draft.nameEn || source.sourceFile.name;
    setImageStatusLine('Preparing original photo...');
    const result = await prepareCandidateFile(source.sourceFile, alt);
    if ('error' in result) {
      showToast(result.error || 'Failed to prepare the original photo.', { variant: 'error' });
    }
    updateSessionCandidates((candidates) =>
      candidates.map((candidate) => {
        if (candidate.id !== candidateId) return candidate;
        if ('error' in result) {
          return { ...candidate, status: 'error' as const, error: result.error };
        }
        return {
          ...candidate,
          status: 'ready' as const,
          error: undefined,
          variants: result.variants,
          serverPreview: result.serverPreview,
        };
      })
    );
  }

  async function runCandidateEnhance(
    candidateId: string,
    source: GenerationSession,
    aiSlot: number,
    aiTotal: number
  ) {
    const alt = draft.altEn || draft.nameEn || source.sourceFile.name;
    setImageStatusLine(`Creating AI option ${aiSlot} of ${aiTotal}...`);
    const presetKey = (aiSlot as SafePresentationPresetKey) in presentationPresets ? (aiSlot as SafePresentationPresetKey) : 2;
    const result = await enhanceCandidateFile(
      source.sourceFile,
      alt,
      {
        basePrompt: basePreservationPrompt,
        presentationPreset: presentationPresets[presetKey],
      },
      analysis
    );
    if ('error' in result) {
      showToast(`AI option ${aiSlot} failed: ${result.error}`, { variant: 'error' });
    }
    updateSessionCandidates((candidates) => {
      const next = candidates.map((candidate) => {
        if (candidate.id !== candidateId) return candidate;
        if ('error' in result) {
          return { ...candidate, status: 'error' as const, error: result.error };
        }
        return {
          ...candidate,
          status: 'ready' as const,
          error: undefined,
          variants: result.variants,
          serverPreview: result.serverPreview,
        };
      });
      refreshImageStatusLine(next, aiTotal);
      return next;
    });
  }

  function startOptionalAiGeneration() {
    const source = optionalAiSource;
    if (!source) {
      setError('Add a product photo first, then you can create optional AI alternatives.');
      return;
    }
    if (!hasPrimaryReady) {
      setError('Wait for the original photo to finish preparing before creating AI alternatives.');
      return;
    }

    setError('');
    const sessionBase: GenerationSession = {
      sourceFile: source.file,
      sourcePreview: source.preview,
      aiOptionCount,
      phase: 'generating',
      statusLine: `Creating AI option 1 of ${aiOptionCount}…`,
      candidates: [],
    };
    const candidates = buildAiOnlyCandidates(aiOptionCount, sessionBase);
    sessionBase.candidates = candidates;
    setGenerationSession(sessionBase);
    setImageStatusLine(`Creating AI option 1 of ${aiOptionCount}…`);

    const tasks = candidates
      .filter((candidate) => candidate.aiSlot)
      .map((candidate) =>
        runCandidateEnhance(candidate.id, sessionBase, candidate.aiSlot!, candidates.length)
      );

    void Promise.all(tasks)
      .then(() => {
        setGenerationSession((current) =>
          current
            ? {
                ...current,
                phase: 'select',
                statusLine: 'Ready',
              }
            : current
        );
        setImageStatusLine('Ready');
      })
      .catch(() => {
        showToast('Could not finish creating AI images. Check your connection and try again.', {
          variant: 'error',
        });
      });
  }

  function toggleCandidateSelection(candidateId: string) {
    updateSessionCandidates((candidates) => {
      const target = candidates.find((candidate) => candidate.id === candidateId);
      if (!target || !hasReadyWebp(target)) return candidates;

      const willSelect = !target.selected;
      let next = candidates.map((candidate) =>
        candidate.id === candidateId ? { ...candidate, selected: willSelect } : candidate
      );

      const selectedReady = next.filter((candidate) => candidate.selected && hasReadyWebp(candidate));
      if (willSelect && selectedReady.length === 1) {
        next = next.map((candidate) => ({
          ...candidate,
          isMain: candidate.id === candidateId,
        }));
      } else if (!willSelect && target.isMain) {
        const fallback = selectedReady[0];
        next = next.map((candidate) => ({
          ...candidate,
          isMain: fallback ? candidate.id === fallback.id : false,
        }));
      }
      return next;
    });
    setSavedProduct(null);
  }

  function setCandidateMain(candidateId: string) {
    updateSessionCandidates((candidates) =>
      candidates.map((candidate) => ({
        ...candidate,
        isMain: candidate.id === candidateId,
        selected: candidate.id === candidateId ? true : candidate.selected,
      }))
    );
    setSavedProduct(null);
  }

  function retryCandidate(candidateId: string) {
    if (!generationSession) return;
    const candidate = generationSession.candidates.find((row) => row.id === candidateId);
    if (!candidate) return;

    setError('');
    updateSessionCandidates((candidates) =>
      candidates.map((row) =>
        row.id === candidateId
          ? {
              ...row,
              status: row.kind === 'original' ? 'preparing' : 'generating',
              error: undefined,
            }
          : row
      )
    );

    if (candidate.kind === 'original') {
      void runCandidatePrepare(candidateId, generationSession);
    } else if (candidate.aiSlot) {
      const aiTotal = generationSession.candidates.filter((row) => row.kind === 'ai').length;
      void runCandidateEnhance(candidateId, generationSession, candidate.aiSlot, aiTotal);
    }
  }

  function commitSelectedCandidates(options?: { keepPending?: boolean }): boolean {
    if (!generationSession) return true;
    const selected = generationSession.candidates.filter(
      (candidate) => candidate.selected && hasReadyWebp(candidate)
    );
    if (!selected.length) {
      setError('Select at least one image with a ready WebP version for the product gallery.');
      return false;
    }

    const selectedIds = new Set(selected.map((candidate) => candidate.id));
    const remaining = generationSession.candidates.filter(
      (candidate) => !selectedIds.has(candidate.id)
    );
    const hasPending = remaining.some((candidate) => isCandidateInFlight(candidate));

    setImageDrafts((current) => {
      const explicitMain = selected.find((candidate) => candidate.isMain) ?? null;
      let next = [...current];
      // Only steal Main when the user explicitly marked an AI option as Main.
      if (explicitMain) {
        next = next.map((draft) => ({ ...draft, isPrimary: false }));
      }
      selected.forEach((candidate) => {
        next.push({
          id: createId(),
          file: candidate.file,
          localPreview: candidate.serverPreview ?? candidate.localPreview,
          variants: candidate.variants ?? [],
          serverPreview: candidate.serverPreview,
          isPrimary: explicitMain ? candidate.id === explicitMain.id : false,
          enhanced: candidate.enhanced,
        });
      });
      if (!next.some((draft) => draft.isPrimary) && next.length) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return next;
    });

    if (options?.keepPending && remaining.length > 0) {
      setGenerationSession({
        ...generationSession,
        candidates: remaining,
        phase: hasPending ? 'generating' : 'select',
        statusLine: hasPending ? generationSession.statusLine || 'Creating AI options…' : 'Ready',
      });
      if (!hasPending) setImageStatusLine('Ready');
      return true;
    }

    cancelGenerationSession();
    return true;
  }

  function handleImagesContinue() {
    const sessionHasReadySelection = Boolean(
      generationSession?.candidates.some(
        (candidate) => candidate.selected && hasReadyWebp(candidate)
      )
    );

    // Commit any selected optional AI images; keep unfinished AI work in the background.
    if (generationSession && sessionHasReadySelection) {
      if (!commitSelectedCandidates({ keepPending: true })) return;
    }

    if (!hasPrimaryReady && !sessionHasReadySelection) {
      setError('Add a product photo first. The original image is enough to continue to text.');
      return;
    }

    if (imageDrafts.some((row) => !hasReadyWebp(row))) {
      setError('Every gallery image must have a ready WebP version before continuing.');
      return;
    }

    setError('');
    if (isImageGenerationInFlight) {
      showToast('Continuing to text. Optional AI images can finish in the background.');
    }
    setActiveStep('text');
  }

  function handleAiOptionCountChange(count: AiOptionCount) {
    setAiOptionCount(count);
    setGenerationSession((current) => (current ? { ...current, aiOptionCount: count } : current));
  }

  async function requestDraft() {
    const reference = primaryDraft ?? imageDrafts[0];
    if (!reference) {
      setError('Add at least one image before generating product text.');
      return;
    }

    setError('');
    setSavedProduct(null);
    setLoading({ kind: 'draft' });
    const formData = new FormData();
    formData.append('file', reference.file);
    formData.append('hints', JSON.stringify(hints));

    try {
      const response = await fetch('/api/admin/products/ai-draft', {
        method: 'POST',
        body: formData,
      });
      const payload = await readJsonResponse(response);

      if (!response.ok) {
        setError(String(payload.error ?? 'Failed to create AI draft.'));
        return;
      }

      const nextAnalysis = payload.analysis as ProductImageAnalysis;
      const nextDraft = payload.draft as ProductDraftCopy;
      setAnalysis(nextAnalysis);
      setDraft(nextDraft);
      recordTextGeneration(nextDraft);
      setPresentationCsv(isFlowerProduct ? presentationFormatFromAnalysis(nextAnalysis) : '');
      if (!price && hints.price) setPrice(hints.price);

      // Cache analysis on the reference draft so a later AI enhance can reuse it.
      setImageDrafts((current) =>
        current.map((d) => (d.id === reference.id ? { ...d, analysis: nextAnalysis } : d))
      );
    } catch {
      setError('Could not create the AI draft. Check your connection and try again.');
    } finally {
      setLoading(null);
    }
  }

  async function saveProductForReview() {
    if (!hasPositivePrice(price)) {
      setError('Enter a product price greater than 0 before saving for review.');
      return;
    }
    if (!hasPrimaryReady) {
      setError('Select at least one WebP-ready image and mark it as Main before saving.');
      return;
    }
    if (imageDrafts.some((row) => !hasReadyWebp(row))) {
      setError('Every selected gallery image must have a ready WebP asset before saving.');
      return;
    }

    const primaryId = primaryDraft?.id ?? readyDrafts[0]?.id ?? null;
    const altFallback = draft.altEn || draft.nameEn;
    const imagesPayload: Array<{ assetId: string; alt?: string; format?: string; isPrimary: boolean }> = [];

    readyDrafts.forEach((d) => {
      (d.variants ?? []).forEach((variant) => {
        if (variant.format !== 'webp') return;
        imagesPayload.push({
          assetId: variant.assetId,
          alt: variant.alt || altFallback,
          format: 'webp',
          isPrimary: d.id === primaryId,
        });
      });
    });

    setError('');
    setLoading({ kind: 'publish' });
    try {
      const response = await fetch('/api/admin/products/publish', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          itemCategory: hints.itemCategory,
          price,
          images: imagesPayload,
          colors: colorTags,
          flowerTypes,
          occasion: occasionTags,
          presentationFormats: splitList(presentationCsv),
          deliveryOptions,
          excludedDeliveryDestinations: DELIVERY_DESTINATIONS.filter(
            (destination) => !availableDeliveryDestinations.includes(destination)
          ),
          featuredPopular,
          pricingType: isFlowerProduct ? pricingType : 'single_price',
        }),
      });
      const payload = await readJsonResponse(response);

      if (!response.ok) {
        setError(String(payload.error ?? 'Could not save this product for review.'));
        return;
      }

      setSavedProduct({
        id: String(payload.id),
        slug: String(payload.slug),
        reviewUrl: String(payload.reviewUrl || `/admin/products/bouquet/${payload.id}`),
      });
    } catch {
      setError('Could not save this product for review. Check your connection and try again.');
    } finally {
      setLoading(null);
    }
  }

  function resetWizard() {
    imageDrafts.forEach((d) => {
      try {
        URL.revokeObjectURL(d.localPreview);
      } catch {
        // ignore
      }
    });
    setImageDrafts([]);
    cancelGenerationSession();
    clearOptionalAiSource();
    notifiedReadyCandidateIdsRef.current.clear();
    setAiOptionCount(2);
    setImageStatusLine('');
    setIsPreparingOriginal(false);
    setPendingCropFile(null);
    setHints(emptyHints);
    setAnalysis(null);
    setDraft(emptyDraft);
    setPrice('');
    setColorTags([]);
    setFlowerTypes([]);
    setOccasionTags([]);
    setPresentationCsv('bouquet');
    setDeliveryOptions(['same_day', 'next_day']);
    setAvailableDeliveryDestinations([...DELIVERY_DESTINATIONS]);
    setFeaturedPopular(false);
    setPricingType('single_price');
    setBasePreservationPrompt(DEFAULT_BASE_PRODUCT_PRESERVATION_PROMPT);
    setPresentationPresets({ ...DEFAULT_SAFE_PRESENTATION_PRESETS });
    setShowRules(false);
    setLoading(null);
    setError('');
    setSavedProduct(null);
    setActiveStep('images');
  }

  function handlePresentationPresetChange(preset: SafePresentationPresetKey, value: string) {
    setPresentationPresets((current) => ({ ...current, [preset]: value }));
  }

  return (
    <div className="admin-orders admin-product-create">
      <nav className="admin-product-create-stepper" aria-label="Product creation steps">
        {stepOrder.map((step, index) => {
          const isActive = activeStep === step;
          const isComplete = stepCompletion[step];
          return (
            <button
              key={step}
              type="button"
              className={`admin-product-create-stepper-item${isActive ? ' is-active' : ''}${
                isComplete ? ' is-complete' : ''
              }`}
              onClick={() => setActiveStep(step)}
            >
              <span className="admin-product-create-stepper-number">{isComplete ? '✓' : index + 1}</span>
              <span className="admin-product-create-stepper-text">
                <strong>{stepCopy[step].label}</strong>
                <small>{stepCopy[step].eyebrow}</small>
              </span>
            </button>
          );
        })}
      </nav>

      {error ? (
        <div className="admin-product-create-alert" role="alert">
          <span className="material-symbols-outlined" aria-hidden="true">
            error
          </span>
          <div>
            <strong>Could not complete this step</strong>
            <p>{error}</p>
          </div>
        </div>
      ) : null}

      {savedProduct ? (
        <section className="admin-product-create-success-page" aria-live="polite">
          <span className="material-symbols-outlined admin-product-create-success-icon" aria-hidden="true">
            check_circle
          </span>
          <span className="admin-product-create-eyebrow">Saved for review</span>
          <h2>Product is saved but not live</h2>
          <p>
            This item is hidden from the public catalog until an owner or admin approves it. Share the internal
            review page with the team when it is ready.
          </p>
          <dl className="admin-product-create-result-meta">
            <div>
              <dt>Catalog ID</dt>
              <dd>{savedProduct.id}</dd>
            </div>
            <div>
              <dt>Catalog slug</dt>
              <dd>{savedProduct.slug}</dd>
            </div>
            <div>
              <dt>Review link</dt>
              <dd>{savedProduct.reviewUrl}</dd>
            </div>
          </dl>
          <div className="admin-product-create-result-actions">
            <Link className="admin-btn admin-btn-primary" href={savedProduct.reviewUrl}>
              Open review page
            </Link>
            <Link className="admin-btn admin-btn-outline" href="/admin/products">
              View moderation queue
            </Link>
            <button className="admin-btn admin-btn-outline" type="button" onClick={resetWizard}>
              Create another product
            </button>
          </div>
        </section>
      ) : (
        <>
          {activeStep === 'images' ? (
            <ProductCreateImagesStep
              imageDrafts={imageDrafts}
              generationSession={generationSession}
              optionalAiSourcePreview={optionalAiSource?.preview ?? null}
              aiOptionCount={aiOptionCount}
              basePreservationPrompt={basePreservationPrompt}
              presentationPresets={presentationPresets}
              showRules={showRules}
              isBusy={isPreparingOriginal}
              isGenerating={isImageGenerationInFlight}
              statusLine={imageStatusLine}
              onAiOptionCountChange={handleAiOptionCountChange}
              onBasePreservationPromptChange={setBasePreservationPrompt}
              onPresentationPresetChange={handlePresentationPresetChange}
              onShowRulesChange={setShowRules}
              onAddFiles={(files) => {
                for (const file of files) handleNewFileSelected(file);
              }}
              onCancelSession={cancelGenerationSession}
              onCreateOptionalAiImages={startOptionalAiGeneration}
              onToggleCandidate={toggleCandidateSelection}
              onSetCandidateMain={setCandidateMain}
              onRetryCandidate={retryCandidate}
              onSetDraftPrimary={setPrimary}
              onRemoveDraft={removeDraft}
              canContinue={canContinueFromImages}
              onContinue={handleImagesContinue}
            />
          ) : null}

          {activeStep === 'text' ? (
            <TextStep
              primaryDraft={primaryDraft ?? imageDrafts[0] ?? null}
              hints={hints}
              isFlowerProduct={isFlowerProduct}
              itemCategoryLabel={itemCategoryLabel}
              occasionHintValues={occasionHintValues}
              colorHintValues={colorHintValues}
              onColorHintsChange={setColorHints}
              draft={draft}
              analysis={analysis}
              loading={loading}
              imageGenerationInFlight={isImageGenerationInFlight}
              onChangeHint={updateHint}
              onOccasionHintsChange={setOccasionHints}
              onChangeItemCategory={updateItemCategory}
              onChangeProductType={updateProductType}
              onChangeDraft={updateDraft}
              onChangeAnalysis={updateAnalysis}
              onGenerateText={requestDraft}
              onBack={() => setActiveStep('images')}
              onContinue={() => {
                setColorTags((current) => (current.length ? current : [...colorHintValues]));
                setOccasionTags((current) => (current.length ? current : [...occasionHintValues]));
                setActiveStep('review');
              }}
            />
          ) : null}

          {activeStep === 'review' ? (
            <ReviewStep
              draft={draft}
              price={price}
              setPrice={setPrice}
              colorTags={colorTags}
              setColorTags={setColorTags}
              flowerTypes={flowerTypes}
              setFlowerTypes={setFlowerTypes}
              occasionTags={occasionTags}
              setOccasionTags={setOccasionTags}
              presentationCsv={presentationCsv}
              setPresentationCsv={setPresentationCsv}
              deliveryOptions={deliveryOptions}
              setDeliveryOptions={setDeliveryOptions}
              isFlowerProduct={isFlowerProduct}
              hints={hints}
              onChangeItemCategory={updateItemCategory}
              availableDeliveryDestinations={availableDeliveryDestinations}
              onToggleDeliveryDestination={toggleAvailableDeliveryDestination}
              featuredPopular={featuredPopular}
              setFeaturedPopular={setFeaturedPopular}
              pricingType={pricingType}
              setPricingType={setPricingType}
              primaryDraft={primaryDraft ?? imageDrafts[0] ?? null}
              readyDraftsCount={readyDrafts.length}
              loading={loading}
              canSaveForReview={canSaveForReview}
              onBack={() => setActiveStep('text')}
              onSave={saveProductForReview}
            />
          ) : null}
        </>
      )}

      <AdminImageCropModal
        open={Boolean(pendingCropFile)}
        file={pendingCropFile}
        title="Crop new image"
        onCancel={() => setPendingCropFile(null)}
        onSkip={skipPendingCrop}
        onApply={({ file }) => applyPendingCrop(file)}
      />

      <section className="admin-product-create-history" aria-labelledby="text-generation-history-title">
        <div className="admin-product-create-history-head">
          <div>
            <span className="admin-product-create-eyebrow">Text history</span>
            <h2 id="text-generation-history-title">Recent generated text</h2>
            <p>Product names generated on this browser, with the account that generated them.</p>
          </div>
          {textGenerationHistory.length ? (
            <span className="admin-product-create-history-count">{textGenerationHistory.length}</span>
          ) : null}
        </div>

        {textGenerationHistory.length ? (
          <div className="admin-product-create-history-list">
            {textGenerationHistory.map((entry) => (
              <article className="admin-product-create-history-item" key={entry.id}>
                <span className="material-symbols-outlined admin-product-create-history-icon" aria-hidden="true">
                  history
                </span>
                <div>
                  <strong>{entry.nameEn || entry.nameTh || 'Untitled product'}</strong>
                  {entry.nameTh ? <span>{entry.nameTh}</span> : null}
                  <small>
                    Generated {formatGeneratedAt(entry.generatedAt)} by {entry.account}
                  </small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="admin-product-create-history-empty">Generated product names will appear here after you use Generate text.</p>
        )}
      </section>
    </div>
  );
}

type TextStepProps = {
  primaryDraft: ImageDraft | null;
  hints: Hints;
  isFlowerProduct: boolean;
  itemCategoryLabel: string;
  occasionHintValues: string[];
  colorHintValues: string[];
  onColorHintsChange: (values: string[]) => void;
  draft: ProductDraftCopy;
  analysis: ProductImageAnalysis | null;
  loading: LoadingState;
  imageGenerationInFlight: boolean;
  onChangeHint: (key: keyof Hints, value: string) => void;
  onOccasionHintsChange: (values: string[]) => void;
  onChangeItemCategory: (value: string) => void;
  onChangeProductType: (value: string) => void;
  onChangeDraft: (key: keyof ProductDraftCopy, value: string) => void;
  onChangeAnalysis: (key: keyof ProductImageAnalysis, value: string) => void;
  onGenerateText: () => Promise<void>;
  onBack: () => void;
  onContinue: () => void;
};

function TextStep({
  primaryDraft,
  hints,
  isFlowerProduct,
  itemCategoryLabel,
  occasionHintValues,
  colorHintValues,
  onColorHintsChange,
  draft,
  analysis,
  loading,
  imageGenerationInFlight,
  onChangeHint,
  onOccasionHintsChange,
  onChangeItemCategory,
  onChangeProductType,
  onChangeDraft,
  onChangeAnalysis,
  onGenerateText,
  onBack,
  onContinue,
}: TextStepProps) {
  const isBusy = Boolean(loading);

  return (
    <section className="admin-product-create-step-panel">
      <header className="admin-product-create-step-header">
        <div>
          <span className="admin-product-create-eyebrow">{stepCopy.text.eyebrow}</span>
          <h3>{stepCopy.text.label}</h3>
          <p>{stepCopy.text.description}</p>
        </div>
        {primaryDraft ? (
          <div className="admin-product-create-step-thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={primaryDraft.serverPreview || primaryDraft.localPreview} alt="Reference for text" />
            <small>Main image used for AI analysis</small>
          </div>
        ) : null}
      </header>

      {imageGenerationInFlight ? (
        <p className="admin-hint" role="status">
          AI image options are still generating in the background. You can generate text now, or go
          back to Images when they finish.
        </p>
      ) : null}

      <section className="admin-product-create-grid">
        <div className="admin-product-create-card">
          <div>
            <div className="admin-product-create-step">Hints</div>
            <p className="admin-product-create-card-hint">
              These hints help the AI write more accurate product copy.
            </p>
          </div>
          <div className="admin-product-create-two">
            <label className="admin-form-group">
              <span>Item category</span>
              <select
                className="admin-input"
                value={hints.itemCategory}
                onChange={(event) => onChangeItemCategory(event.target.value)}
              >
                {adminItemCategoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-form-group">
              <span>Target price</span>
              <input
                className="admin-input"
                inputMode="decimal"
                value={hints.price}
                onChange={(event) => onChangeHint('price', event.target.value)}
              />
              <small>Product price only. Exclude delivery.</small>
            </label>
          </div>
          {isFlowerProduct ? (
            <label className="admin-form-group">
              <span>Bouquet presentation hint</span>
              <select
                className="admin-input"
                value={hints.productType}
                onChange={(event) => onChangeProductType(event.target.value)}
              >
                {BOUQUET_PRESENTATION_FORMAT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.title}
                  </option>
                ))}
              </select>
              <small>Used by AI and saved as the flower presentation format.</small>
            </label>
          ) : (
            <p className="admin-hint">
              AI will write copy for {itemCategoryLabel.toLowerCase()} and save it as a non-flower product.
            </p>
          )}
          <fieldset className="admin-form-group admin-product-create-occasion-hints">
            <legend>Occasion hint</legend>
            <p className="admin-product-create-card-hint">
              Select occasions to guide AI copy. These are chosen by you, not inferred as free text.
            </p>
            <AdminCheckboxGrid
              idPrefix="create-occasion-hints"
              options={[...ADMIN_OCCASION_OPTIONS]}
              selected={occasionHintValues}
              onChange={onOccasionHintsChange}
            />
          </fieldset>
          <fieldset className="admin-form-group admin-product-create-occasion-hints">
            <legend>Color hint</legend>
            <p className="admin-product-create-card-hint">
              Select colors to guide AI copy. These are chosen by you, not inferred as free text.
            </p>
            <AdminCheckboxGrid
              idPrefix="create-color-hints"
              options={[...ADMIN_COLOR_OPTIONS]}
              selected={colorHintValues}
              onChange={onColorHintsChange}
            />
          </fieldset>
          <label className="admin-form-group">
            <span>AI notes</span>
            <textarea
              className="admin-input admin-product-create-textarea"
              value={hints.notes}
              onChange={(event) => onChangeHint('notes', event.target.value)}
              placeholder="Example: preserve the basket, write for birthday and congratulations shoppers"
            />
          </label>
          <button
            className="admin-btn admin-btn-primary admin-product-create-main-action"
            type="button"
            disabled={isBusy || !primaryDraft}
            onClick={onGenerateText}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              auto_awesome
            </span>
            {loading?.kind === 'draft' ? 'Generating text…' : 'Generate text'}
          </button>
        </div>

        <div className="admin-product-create-card">
          <div>
            <div className="admin-product-create-step">Bilingual copy</div>
            <p className="admin-product-create-card-hint">
              Edit the English and Thai copy exactly as it should appear to customers.
            </p>
          </div>
          <div className="admin-product-create-two">
            <label className="admin-form-group">
              <span>Name EN</span>
              <input
                className="admin-input"
                value={draft.nameEn}
                onChange={(event) => onChangeDraft('nameEn', event.target.value)}
              />
            </label>
            <label className="admin-form-group">
              <span>Name TH</span>
              <input
                className="admin-input"
                value={draft.nameTh}
                onChange={(event) => onChangeDraft('nameTh', event.target.value)}
              />
            </label>
          </div>
          <label className="admin-form-group">
            <span>Description EN</span>
            <textarea
              className="admin-input admin-product-create-textarea"
              value={draft.descriptionEn}
              onChange={(event) => onChangeDraft('descriptionEn', event.target.value)}
            />
          </label>
          <label className="admin-form-group">
            <span>Description TH</span>
            <textarea
              className="admin-input admin-product-create-textarea"
              value={draft.descriptionTh}
              onChange={(event) => onChangeDraft('descriptionTh', event.target.value)}
            />
          </label>
          <div className="admin-product-create-two">
            <label className="admin-form-group">
              <span>Composition EN</span>
              <input
                className="admin-input"
                value={draft.compositionEn}
                onChange={(event) => onChangeDraft('compositionEn', event.target.value)}
              />
            </label>
            <label className="admin-form-group">
              <span>Composition TH</span>
              <input
                className="admin-input"
                value={draft.compositionTh}
                onChange={(event) => onChangeDraft('compositionTh', event.target.value)}
              />
            </label>
          </div>
          <label className="admin-form-group">
            <span>Image alt text (EN)</span>
            <input
              className="admin-input"
              value={draft.altEn}
              onChange={(event) => onChangeDraft('altEn', event.target.value)}
            />
          </label>
        </div>
      </section>

      {analysis ? (
        <details className="admin-product-create-analysis">
          <summary>Edit AI image analysis (optional)</summary>
          <div className="admin-product-create-two">
            <label className="admin-form-group">
              <span>{isFlowerProduct ? 'Visible flowers' : 'Visible items'}</span>
              <input
                className="admin-input"
                value={joinList(analysis.identifiedFlowers)}
                onChange={(event) => onChangeAnalysis('identifiedFlowers', event.target.value)}
              />
            </label>
            <label className="admin-form-group">
              <span>Colors</span>
              <input
                className="admin-input"
                value={joinList(analysis.colors)}
                onChange={(event) => onChangeAnalysis('colors', event.target.value)}
              />
            </label>
          </div>
          <label className="admin-form-group">
            <span>Format and container</span>
            <input
              className="admin-input"
              value={`${analysis.productFormat} - ${analysis.wrappingOrContainer}`}
              onChange={(event) => onChangeAnalysis('productFormat', event.target.value)}
            />
          </label>
          <label className="admin-form-group">
            <span>Uncertain items</span>
            <input
              className="admin-input"
              value={joinList(analysis.uncertainItems)}
              onChange={(event) => onChangeAnalysis('uncertainItems', event.target.value)}
            />
          </label>
          <p className="admin-product-create-note">{analysis.rawSummary || analysis.confidenceNotes}</p>
        </details>
      ) : null}

      <div className="admin-product-create-step-actions">
        <button type="button" className="admin-btn admin-btn-outline" onClick={onBack}>
          ← Back to images
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          disabled={!draft.nameEn.trim()}
          onClick={onContinue}
        >
          Continue to review →
        </button>
      </div>
    </section>
  );
}

type ReviewStepProps = {
  draft: ProductDraftCopy;
  price: string;
  setPrice: (value: string) => void;
  colorTags: string[];
  setColorTags: (value: string[]) => void;
  flowerTypes: string[];
  setFlowerTypes: (value: string[]) => void;
  occasionTags: string[];
  setOccasionTags: (value: string[]) => void;
  presentationCsv: string;
  setPresentationCsv: (value: string) => void;
  deliveryOptions: string[];
  setDeliveryOptions: (value: string[]) => void;
  isFlowerProduct: boolean;
  hints: Hints;
  onChangeItemCategory: (value: string) => void;
  availableDeliveryDestinations: DeliveryDestinationId[];
  onToggleDeliveryDestination: (value: DeliveryDestinationId) => void;
  featuredPopular: boolean;
  setFeaturedPopular: (value: boolean) => void;
  pricingType: PricingType;
  setPricingType: (value: PricingType) => void;
  primaryDraft: ImageDraft | null;
  readyDraftsCount: number;
  loading: LoadingState;
  canSaveForReview: boolean;
  onBack: () => void;
  onSave: () => Promise<void>;
};

function ReviewStep({
  draft,
  price,
  setPrice,
  colorTags,
  setColorTags,
  flowerTypes,
  setFlowerTypes,
  occasionTags,
  setOccasionTags,
  presentationCsv,
  setPresentationCsv,
  deliveryOptions,
  setDeliveryOptions,
  isFlowerProduct,
  hints,
  onChangeItemCategory,
  availableDeliveryDestinations,
  onToggleDeliveryDestination,
  featuredPopular,
  setFeaturedPopular,
  pricingType,
  setPricingType,
  primaryDraft,
  readyDraftsCount,
  loading,
  canSaveForReview,
  onBack,
  onSave,
}: ReviewStepProps) {
  return (
    <section className="admin-product-create-step-panel">
      <header className="admin-product-create-step-header">
        <div>
          <span className="admin-product-create-eyebrow">{stepCopy.review.eyebrow}</span>
          <h3>{stepCopy.review.label}</h3>
          <p>{stepCopy.review.description}</p>
        </div>
      </header>

      <div className="admin-product-create-card">
        {primaryDraft ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="admin-product-create-image"
            src={primaryDraft.serverPreview || primaryDraft.localPreview}
            alt="Main product preview"
          />
        ) : (
          <p className="admin-hint">No main image. Go back to step 1 to add one.</p>
        )}
        <p className="admin-product-create-card-hint">
          {readyDraftsCount} image{readyDraftsCount === 1 ? '' : 's'} ready to publish.
        </p>

        <div className="admin-product-create-two">
          <label className="admin-form-group">
            <span>Price THB</span>
            <input
              className="admin-input"
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </label>
          <label className="admin-form-group">
            <span>{isFlowerProduct ? 'Presentation formats' : 'Item category'}</span>
            {isFlowerProduct ? (
              <input
                className="admin-input"
                value={presentationCsv}
                onChange={(event) => setPresentationCsv(event.target.value)}
              />
            ) : (
              <select
                className="admin-input"
                value={hints.itemCategory}
                onChange={(event) => onChangeItemCategory(event.target.value)}
              >
                {adminItemCategoryOptions
                  .filter((option) => option.value !== 'flowers')
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
            )}
          </label>
        </div>
        <fieldset className="admin-form-group">
          <legend>Pricing options</legend>
          {isFlowerProduct ? (
            <>
              <p className="admin-product-create-card-hint">
                Choose how customers pick a variant on the product page. You can fine-tune sizes and
                prices after saving on the bouquet review page.
              </p>
              <div className="admin-product-create-choice-grid">
                {ADMIN_PRICING_TYPE_OPTIONS.map((option) => (
                  <label className="admin-product-create-choice" key={option.value}>
                    <input
                      type="radio"
                      name="create-pricing-type"
                      checked={pricingType === option.value}
                      onChange={() => setPricingType(option.value)}
                    />
                    <span>
                      <strong>{option.label}</strong>
                      {option.helper ? <small>{option.helper}</small> : null}
                    </span>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <p className="admin-product-create-card-hint">
              Non-flower products use a single price with one purchasable option (no size or stem
              tiers).
            </p>
          )}
        </fieldset>
        <fieldset className="admin-form-group admin-product-create-occasion-hints">
          <legend>Color tags</legend>
          <p className="admin-product-create-card-hint">
            Select catalog color filters for this product. Not filled by AI — choose them here.
          </p>
          <AdminCheckboxGrid
            idPrefix="create-color-tags"
            options={[...ADMIN_COLOR_OPTIONS]}
            selected={colorTags}
            onChange={setColorTags}
          />
        </fieldset>
        {isFlowerProduct ? (
          <fieldset className="admin-form-group admin-product-create-occasion-hints">
            <legend>Flower tags</legend>
            <p className="admin-product-create-card-hint">
              Select the flower types visible in this product. These are not filled by AI — choose them here.
            </p>
            <AdminCheckboxGrid
              idPrefix="create-flower-types"
              options={[...ADMIN_FLOWER_TYPE_OPTIONS]}
              selected={flowerTypes}
              onChange={setFlowerTypes}
            />
          </fieldset>
        ) : null}
        <fieldset className="admin-form-group admin-product-create-occasion-hints">
          <legend>Occasion tags</legend>
          <p className="admin-product-create-card-hint">
            Select catalog occasion filters for this product. Not filled by AI — choose them here.
          </p>
          <AdminCheckboxGrid
            idPrefix="create-occasion-tags"
            options={[...ADMIN_OCCASION_OPTIONS]}
            selected={occasionTags}
            onChange={setOccasionTags}
          />
        </fieldset>
        <fieldset className="admin-form-group admin-product-create-occasion-hints">
          <legend>Available provinces / markets</legend>
          <div className="admin-product-create-choice-grid">
            {deliveryDestinationOptions.map((option) => (
              <label className="admin-product-create-choice" key={option.value}>
                <input
                  type="checkbox"
                  checked={availableDeliveryDestinations.includes(option.value)}
                  onChange={() => onToggleDeliveryDestination(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <small>Uncheck destinations where this product should not be sold.</small>
        </fieldset>
        {isFlowerProduct ? (
          <>
            <fieldset className="admin-form-group admin-product-create-occasion-hints">
              <legend>Delivery options</legend>
              <p className="admin-product-create-card-hint">
                Choose which delivery speeds apply to this product. These are not set by AI.
              </p>
              <AdminCheckboxGrid
                idPrefix="create-delivery-options"
                options={[...ADMIN_DELIVERY_SPEED_OPTIONS]}
                selected={deliveryOptions}
                onChange={setDeliveryOptions}
              />
            </fieldset>
            <label className="admin-product-create-checkbox">
              <input
                type="checkbox"
                checked={featuredPopular}
                onChange={(event) => setFeaturedPopular(event.target.checked)}
              />
              Show as popular on homepage
            </label>
          </>
        ) : null}
        <div className="admin-product-create-preview">
          <strong>{draft.nameEn || 'Product name'}</strong>
          <span>{price ? `THB ${price}` : 'Set a price before saving'}</span>
          <p>{draft.descriptionEn || 'Description preview will appear here.'}</p>
        </div>
      </div>

      <div className="admin-product-create-step-actions">
        <button type="button" className="admin-btn admin-btn-outline" onClick={onBack}>
          ← Back to text
        </button>
        <button
          className="admin-btn admin-btn-primary"
          type="button"
          disabled={!canSaveForReview || Boolean(loading)}
          onClick={onSave}
        >
          {loading?.kind === 'publish' ? 'Saving…' : 'Save for review'}
        </button>
      </div>
    </section>
  );
}
