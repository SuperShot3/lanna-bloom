/**
 * Browser-only: shrink proof photos to the same cap as receipts; PDFs pass through up to MAX_PROOF_PDF_BYTES.
 */

import { compressReceiptImageForUpload } from '@/lib/receiptImageCompress';
import {
  MAX_PROOF_IMAGE_BYTES,
  MAX_PROOF_PDF_BYTES,
  formatMaxFileErrorLabel,
} from '@/lib/receiptUploadLimits';

export function isProofPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

export async function prepareProofFileForUpload(file: File): Promise<File> {
  if (isProofPdfFile(file)) {
    if (file.size > MAX_PROOF_PDF_BYTES) {
      throw new Error(
        `PDF is too large. Max size is ${formatMaxFileErrorLabel(MAX_PROOF_PDF_BYTES)}.`
      );
    }
    return file;
  }
  return compressReceiptImageForUpload(file, MAX_PROOF_IMAGE_BYTES);
}
