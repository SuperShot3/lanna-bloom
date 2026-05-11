import 'server-only';

import OpenAI, { toFile } from 'openai';
import sharp from 'sharp';
import { fileToDataUrl } from './adminProductImages';

export type ProductImageAnalysis = {
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

export type ProductDraftCopy = {
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

export type ProductDraftHints = {
  itemCategory?: string;
  productType?: string;
  occasion?: string;
  colors?: string;
  price?: string;
  size?: string;
  notes?: string;
};

const DESCRIPTION_RULES = `
Create natural, elegant, searchable English and Thai product copy for a flower and gift shop.
Include product names, short descriptions, visible product contents/composition, SEO fields, and image alt text.
Use phrases such as flower delivery in Chiang Mai, same-day flower delivery, birthday flowers,
romantic bouquet, balloon delivery, plush toy gift, or gift delivery only when they are accurate.
Avoid keyword stuffing, unsupported claims, invented flowers/items, and direct publishing language.
`;

const IMAGE_ENHANCEMENT_RULES = `
A professionally enhanced, hyper-realistic e-commerce product photograph based strictly on the provided reference image.
Retain the exact product, core structure, arrangement, wrapping, basket, vase, pot, balloon, toy, and all visible contents.
Do not add, remove, replace, or rearrange visible items. Remove background clutter and place the product on a pure white
or premium light neutral background. Center the product in a square 1:1 composition with soft natural shadow,
fresh brightness, sharp texture, and realistic commercial studio quality.
No people, hands, text, watermarks, price tags, fake 3D render, plastic look, or artificial styling.
`;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }
  return new OpenAI({ apiKey });
}

function stringifyHints(hints?: ProductDraftHints): string {
  if (!hints) return 'No admin hints supplied.';
  return Object.entries(hints)
    .filter(([, value]) => typeof value === 'string' && value.trim())
    .map(([key, value]) => `${key}: ${String(value).trim()}`)
    .join('\n') || 'No admin hints supplied.';
}

function parseJsonObject<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? '').trim()).filter(Boolean);
}

function normalizeAnalysis(value: Partial<ProductImageAnalysis>): ProductImageAnalysis {
  return {
    productFormat: String(value.productFormat ?? '').trim(),
    identifiedFlowers: toStringArray(value.identifiedFlowers),
    colors: toStringArray(value.colors),
    greenery: toStringArray(value.greenery),
    wrappingOrContainer: String(value.wrappingOrContainer ?? '').trim(),
    arrangementStyle: String(value.arrangementStyle ?? '').trim(),
    suggestedOccasions: toStringArray(value.suggestedOccasions),
    confidenceNotes: String(value.confidenceNotes ?? '').trim(),
    uncertainItems: toStringArray(value.uncertainItems),
    rawSummary: String(value.rawSummary ?? '').trim(),
  };
}

function normalizeDraft(value: Partial<ProductDraftCopy>): ProductDraftCopy {
  return {
    nameEn: String(value.nameEn ?? '').trim(),
    nameTh: String(value.nameTh ?? '').trim(),
    descriptionEn: String(value.descriptionEn ?? '').trim(),
    descriptionTh: String(value.descriptionTh ?? '').trim(),
    compositionEn: String(value.compositionEn ?? '').trim(),
    compositionTh: String(value.compositionTh ?? '').trim(),
    altEn: String(value.altEn ?? '').trim(),
    altTh: String(value.altTh ?? '').trim(),
    seoTitle: String(value.seoTitle ?? '').trim(),
    seoDescription: String(value.seoDescription ?? '').trim(),
    seoKeywords: toStringArray(value.seoKeywords),
    searchPhrases: toStringArray(value.searchPhrases),
  };
}

async function normalizeImageForOpenAiEdit(file: File): Promise<Buffer> {
  const buffer = Buffer.from(await file.arrayBuffer());

  return sharp(buffer, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize(1024, 1024, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
      withoutEnlargement: false,
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .toColorspace('srgb')
    .png({ compressionLevel: 9 })
    .toBuffer();
}

export async function analyzeProductImage(
  file: File,
  hints?: ProductDraftHints
): Promise<ProductImageAnalysis> {
  const client = getClient();
  const dataUrl = await fileToDataUrl(file);

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_PRODUCT_VISION_MODEL?.trim() || 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a careful flower and gift shop product analyst. Return only valid JSON. Identify only visible items and clearly list uncertainty.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              `Analyze this product image for an admin review workflow.\n\nAdmin hints:\n${stringifyHints(hints)}\n\n` +
              'Return JSON with keys: productFormat, identifiedFlowers, colors, greenery, wrappingOrContainer, arrangementStyle, suggestedOccasions, confidenceNotes, uncertainItems, rawSummary. For non-flower products, use identifiedFlowers for clearly visible product components/items or return an empty array if none apply.',
          },
          {
            type: 'image_url',
            image_url: { url: dataUrl, detail: 'high' },
          },
        ],
      },
    ],
  });

  return normalizeAnalysis(
    parseJsonObject<Partial<ProductImageAnalysis>>(completion.choices[0]?.message?.content, {})
  );
}

export async function generateProductDescription(
  analysis: ProductImageAnalysis,
  hints?: ProductDraftHints
): Promise<ProductDraftCopy> {
  const client = getClient();

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_PRODUCT_COPY_MODEL?.trim() || 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You write concise bilingual flower and gift shop product copy for admin review. Return only valid JSON.',
      },
      {
        role: 'user',
        content:
          `${DESCRIPTION_RULES}\n\nAdmin hints:\n${stringifyHints(hints)}\n\n` +
          `Approved/edited product analysis:\n${JSON.stringify(analysis, null, 2)}\n\n` +
          'Return JSON with keys: nameEn, nameTh, descriptionEn, descriptionTh, compositionEn, compositionTh, altEn, altTh, seoTitle, seoDescription, seoKeywords, searchPhrases.',
      },
    ],
  });

  return normalizeDraft(
    parseJsonObject<Partial<ProductDraftCopy>>(completion.choices[0]?.message?.content, {})
  );
}

export async function enhanceProductImage(
  file: File,
  approvedAnalysis: ProductImageAnalysis,
  imageRules = IMAGE_ENHANCEMENT_RULES
): Promise<File> {
  const client = getClient();
  const normalizedPng = await normalizeImageForOpenAiEdit(file);
  const uploadable = await toFile(normalizedPng, 'product-source.png', {
    type: 'image/png',
  });

  const response = await client.images.edit({
    model: process.env.OPENAI_PRODUCT_IMAGE_MODEL?.trim() || 'gpt-image-1',
    image: uploadable,
    prompt:
      `${imageRules}\n\nVisible product analysis to preserve:\n${JSON.stringify(approvedAnalysis, null, 2)}`,
    size: '1024x1024',
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('OpenAI did not return an enhanced image');
  }

  return new File([new Uint8Array(Buffer.from(b64, 'base64'))], 'enhanced-product.png', {
    type: 'image/png',
  });
}
