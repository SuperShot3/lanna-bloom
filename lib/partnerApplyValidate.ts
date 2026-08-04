/**
 * Pure validation for the simplified public partner apply form (Feature 2).
 */

export type PartnerApplyFields = {
  shopName: string;
  provinceCode: string;
  phone: string;
  lineId: string;
  email: string;
  experienceNote: string;
};

export type PartnerApplyValidationResult =
  | { ok: true; data: PartnerApplyFields }
  | { ok: false; error: string };

/** True when at least one of phone / LINE / email is non-empty after trim. */
export function hasAtLeastOneContactMethod(fields: {
  phone?: string;
  lineId?: string;
  email?: string;
}): boolean {
  return Boolean(
    fields.phone?.trim() || fields.lineId?.trim() || fields.email?.trim()
  );
}

/**
 * Validate simplified apply fields.
 * `provinceExists` must be resolved by the caller (e.g. getProvinceByCode).
 */
export function validatePartnerApplyFields(
  fields: PartnerApplyFields,
  opts: { provinceExists: boolean }
): PartnerApplyValidationResult {
  const shopName = fields.shopName.trim();
  const provinceCode = fields.provinceCode.trim();
  const phone = fields.phone.trim();
  const lineId = fields.lineId.trim();
  const email = fields.email.trim();
  const experienceNote = fields.experienceNote.trim();

  if (!shopName) {
    return { ok: false, error: 'Shop name is required' };
  }
  if (!provinceCode) {
    return { ok: false, error: 'Province is required' };
  }
  if (!opts.provinceExists) {
    return { ok: false, error: 'Invalid province' };
  }
  if (!hasAtLeastOneContactMethod({ phone, lineId, email })) {
    return {
      ok: false,
      error: 'Please enter at least one contact method (phone, LINE, or email).',
    };
  }

  return {
    ok: true,
    data: { shopName, provinceCode, phone, lineId, email, experienceNote },
  };
}
