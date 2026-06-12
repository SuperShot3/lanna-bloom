const IMAGE_NAME = /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i;

/**
 * iOS camera / Photo picker often leaves `file.type` empty while the file is still a photo.
 */
export function isReceiptImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  if (IMAGE_NAME.test(file.name)) return true;
  if (!file.type && file.size > 0) return true;
  return false;
}
