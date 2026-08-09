export type {
  ProvinceRow,
  ProvinceStatus,
  ProvinceUpdateInput,
  PublicProvince,
  SeoPageStatus,
} from './types';
export { PROVINCE_STATUSES, SEO_PAGE_STATUSES } from './types';
export {
  getProvinceStatusFillColor,
  getProvinceStatusLabel,
  getProvinceStatusLabelLocalized,
  PROVINCE_STATUS_LEGEND,
} from './statusColors';
export {
  validateProvinceUpdate,
  toPublicProvince,
  isProvinceStatus,
  isSeoPageStatus,
} from './validate';
export {
  canEnterCatalog,
  categoryAllowed,
  normalizeShopCategoryKey,
  type ShopAccessProvince,
} from './shopAccess';

// Server DB access: import from '@/lib/provinces/queries' (server-only).
