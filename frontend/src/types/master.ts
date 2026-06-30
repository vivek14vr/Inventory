export type Warehouse = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Brand = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Product = {
  id: string;
  name: string;
  secondaryName?: string;
  brandId: string;
  brand: { id: string; name: string; isActive: boolean };
  /** Stocking unit label, e.g. Carton, Box. */
  stockUnit: string;
  /** Base units (pieces) per one stock unit. */
  unitsPerStockUnit: number;
  /** Alert when stock falls to this level or below. */
  lowStockThreshold?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};
