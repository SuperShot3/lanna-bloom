'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CatalogSizePricingRow, CatalogStemPricingRow, PricingType } from '@/lib/catalog/pricing';
import type { CatalogEntityType } from '@/lib/catalog/types';
import type { DeliveryDestinationId } from '@/lib/delivery/markets';

export function catalogShelfItemKey(entityType: CatalogEntityType, id: string): string {
  return `${entityType}:${id}`;
}

export type CatalogProductPendingEdit = {
  nameEn: string;
  nameTh: string;
  descriptionEn: string;
  descriptionTh: string;
  pricingType: PricingType;
  singlePrice: string;
  sizeRows: CatalogSizePricingRow[];
  stemOptions: CatalogStemPricingRow[];
  discountPercent: string;
  occasion: string[];
  availableMarkets: DeliveryDestinationId[];
};

export type CatalogBouquetPendingEdit = {
  nameEn: string;
  nameTh: string;
  descriptionEn: string;
  descriptionTh: string;
  compositionEn: string;
  compositionTh: string;
  pricingType: PricingType;
  singlePrice: string;
  sizeRows: CatalogSizePricingRow[];
  stemOptions: CatalogStemPricingRow[];
  discountPercent: string;
  featuredPopular: boolean;
  deliveryOptions: string[];
  availableMarkets: DeliveryDestinationId[];
  presentationFormats: string[];
  colors: string[];
  flowerTypes: string[];
  occasion: string[];
};

type PendingMap = Record<string, CatalogProductPendingEdit | CatalogBouquetPendingEdit>;

type ContextValue = {
  dirtyKeys: ReadonlySet<string>;
  getProductPending: (productId: string) => CatalogProductPendingEdit | null;
  setProductPending: (productId: string, edit: CatalogProductPendingEdit | null) => void;
  getBouquetPending: (bouquetId: string) => CatalogBouquetPendingEdit | null;
  setBouquetPending: (bouquetId: string, edit: CatalogBouquetPendingEdit | null) => void;
  activePathHasUnsaved: (pathname: string) => boolean;
};

const CatalogShelfDirtyContext = createContext<ContextValue | null>(null);

function isProductPending(
  value: CatalogProductPendingEdit | CatalogBouquetPendingEdit
): value is CatalogProductPendingEdit {
  return !('compositionEn' in value) && !('featuredPopular' in value);
}

export function CatalogShelfDirtyProvider({ children }: { children: ReactNode }) {
  const [pendingByKey, setPendingByKey] = useState<PendingMap>({});

  const setEntry = useCallback(
    (key: string, edit: CatalogProductPendingEdit | CatalogBouquetPendingEdit | null) => {
      setPendingByKey((prev) => {
        if (!edit) {
          if (!(key in prev)) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return { ...prev, [key]: edit };
      });
    },
    []
  );

  const getProductPending = useCallback(
    (productId: string): CatalogProductPendingEdit | null => {
      const value = pendingByKey[catalogShelfItemKey('product', productId)];
      return value && isProductPending(value) ? value : null;
    },
    [pendingByKey]
  );

  const setProductPending = useCallback(
    (productId: string, edit: CatalogProductPendingEdit | null) => {
      setEntry(catalogShelfItemKey('product', productId), edit);
    },
    [setEntry]
  );

  const getBouquetPending = useCallback(
    (bouquetId: string): CatalogBouquetPendingEdit | null => {
      const value = pendingByKey[catalogShelfItemKey('bouquet', bouquetId)];
      return value && !isProductPending(value) ? value : null;
    },
    [pendingByKey]
  );

  const setBouquetPending = useCallback(
    (bouquetId: string, edit: CatalogBouquetPendingEdit | null) => {
      setEntry(catalogShelfItemKey('bouquet', bouquetId), edit);
    },
    [setEntry]
  );

  const dirtyKeys = useMemo(() => new Set(Object.keys(pendingByKey)), [pendingByKey]);

  const activePathHasUnsaved = useCallback(
    (pathname: string) => {
      const productMatch = pathname.match(/\/admin\/products\/product\/([^/]+)/);
      if (productMatch) {
        return dirtyKeys.has(catalogShelfItemKey('product', productMatch[1]));
      }
      const bouquetMatch = pathname.match(/\/admin\/products\/bouquet\/([^/]+)/);
      if (bouquetMatch) {
        return dirtyKeys.has(catalogShelfItemKey('bouquet', bouquetMatch[1]));
      }
      return false;
    },
    [dirtyKeys]
  );

  const value = useMemo(
    () => ({
      dirtyKeys,
      getProductPending,
      setProductPending,
      getBouquetPending,
      setBouquetPending,
      activePathHasUnsaved,
    }),
    [
      dirtyKeys,
      getProductPending,
      setProductPending,
      getBouquetPending,
      setBouquetPending,
      activePathHasUnsaved,
    ]
  );

  return (
    <CatalogShelfDirtyContext.Provider value={value}>{children}</CatalogShelfDirtyContext.Provider>
  );
}

export function useCatalogShelfDirty(): ContextValue {
  const ctx = useContext(CatalogShelfDirtyContext);
  if (!ctx) {
    throw new Error('useCatalogShelfDirty must be used within CatalogShelfDirtyProvider');
  }
  return ctx;
}
