/**
 * Default rules used when asking OpenAI's image-edit model to enhance a product photo.
 *
 * Lives in its own (non `server-only`) module so the admin UI can show the default
 * prompt to admins and let them edit it before sending an "enhance" request.
 */

export const BASE_PRODUCT_PRESERVATION_PROMPT = `
Create a clean, realistic e-commerce catalog image using the uploaded product photo as the strict visual reference.

Preserve the exact visible product identity and composition: the same flowers, colors, quantities, arrangement shape, wrapping, ribbons, basket, vase, pot, balloon, toy, gift items, and all other visible contents.

Do not add, remove, replace, duplicate, enlarge, shrink, rearrange, beautify, or make the product appear fuller or more expensive than in the reference image. Do not change flower colors, wrapping colors, materials, or proportions.

Only improve the presentation of the same real product.

The result must look like a professional photograph of the same real product, suitable for an online flower and gift store.

Do not include people, hands, text, logos, watermarks, price tags, extra decorations, artificial props, fake 3D-rendered appearance, plastic-looking flowers, exaggerated saturation, or unrealistic styling.
`.trim();

export const SAFE_PRESENTATION_PRESETS = {
  1: `
Presentation style: clean warm-white studio background, balanced front lighting, centered square composition, minimal natural shadow.
`.trim(),
  2: `
Presentation style: very light warm-neutral studio background, soft daylight appearance, centered square composition, subtle realistic shadow.
`.trim(),
  3: `
Presentation style: bright clean catalog lighting on a warm-white background, centered square composition, crisp but natural product detail.
`.trim(),
} as const;

export type SafePresentationPresetKey = keyof typeof SAFE_PRESENTATION_PRESETS;

export const DEFAULT_BASE_PRODUCT_PRESERVATION_PROMPT = BASE_PRODUCT_PRESERVATION_PROMPT;
export const DEFAULT_SAFE_PRESENTATION_PRESETS = SAFE_PRESENTATION_PRESETS;

export const DEFAULT_PRODUCT_IMAGE_ENHANCEMENT_RULES = `
A professionally enhanced, hyper-realistic e-commerce product photograph based strictly on the provided reference image.
Retain the exact product, core structure, arrangement, wrapping, basket, vase, pot, balloon, toy, and all visible contents.
Do not add, remove, replace, or rearrange visible items. Remove background clutter and place the product on a pure white
or premium light neutral background. Center the product in a square 1:1 composition with soft natural shadow,
fresh brightness, sharp texture, and realistic commercial studio quality.
No people, hands, text, watermarks, price tags, fake 3D render, plastic look, or artificial styling.
`.trim();
