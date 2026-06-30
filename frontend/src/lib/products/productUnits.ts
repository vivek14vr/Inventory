import type { Product } from "@/types/master";

export type ProductUnitFields = Pick<Product, "stockUnit" | "unitsPerStockUnit">;

export function getUnitsPerStockUnit(
  product?: Partial<ProductUnitFields> | null
): number {
  const n = product?.unitsPerStockUnit;
  return n && n > 0 ? n : 1;
}

export function getStockUnitLabel(product?: Partial<ProductUnitFields> | null): string {
  if (getUnitsPerStockUnit(product) === 1) return "piece";
  const label = product?.stockUnit?.trim();
  return label || "unit";
}

export function usesStockUnit(product?: Partial<ProductUnitFields> | null): boolean {
  return getUnitsPerStockUnit(product) > 1;
}

/** Convert entered stock-unit count (e.g. cartons) to base inventory units. */
export function stockUnitsToBase(
  entered: number,
  product?: Partial<ProductUnitFields> | null
): number {
  return entered * getUnitsPerStockUnit(product);
}

export function pluralizeStockUnit(label: string, count: number): string {
  if (count === 1) return label;
  const lower = label.toLowerCase();
  if (lower.endsWith("s")) return label;
  if (/(x|ch|sh|ss|z)$/.test(lower)) return `${label}es`;
  if (/[^aeiou]y$/.test(lower)) return `${label.slice(0, -1)}ies`;
  return `${label}s`;
}

export function stockUnitQuestionLabel(
  product?: Partial<ProductUnitFields> | null
): string {
  if (!usesStockUnit(product)) return "How many pieces?";
  return `How many ${pluralizeStockUnit(getStockUnitLabel(product), 2)}?`;
}

export function formatStockUnitHint(
  product?: Partial<ProductUnitFields> | null
): string | null {
  if (!usesStockUnit(product)) return null;
  const per = getUnitsPerStockUnit(product);
  const label = getStockUnitLabel(product);
  return `${per} pieces = 1 ${label}`;
}

export type QuantityEntryMode = "stockUnit" | "units";

export function quantityEntryToBase(
  entered: number,
  mode: QuantityEntryMode,
  product?: Partial<ProductUnitFields> | null
): number {
  if (!Number.isFinite(entered) || entered <= 0) return 0;
  if (mode === "units" || !usesStockUnit(product)) {
    return Math.floor(entered);
  }
  return stockUnitsToBase(entered, product);
}

export function formatUnitsEntryPreview(
  entered: number,
  product?: Partial<ProductUnitFields> | null
): string | null {
  if (!usesStockUnit(product) || !Number.isFinite(entered) || entered <= 0) {
    return null;
  }
  const split = splitBaseQuantity(entered, product);
  const boxLabel = pluralizeStockUnit(split.unitLabel, split.fullUnits);
  let boxPart = `${split.fullUnits.toLocaleString()} ${boxLabel}`;
  if (split.loose > 0) {
    boxPart += ` + ${split.loose.toLocaleString()} loose`;
  }
  return `${entered.toLocaleString()} pieces = ${boxPart}`;
}

export function formatQuantityEntryPreview(
  entered: number,
  mode: QuantityEntryMode,
  product?: Partial<ProductUnitFields> | null
): string | null {
  if (!Number.isFinite(entered) || entered <= 0) return null;
  if (mode === "units") {
    return formatUnitsEntryPreview(entered, product);
  }
  return formatEnteredQuantityPreview(entered, product);
}

export function quantityEntryLabel(
  mode: QuantityEntryMode,
  product?: Partial<ProductUnitFields> | null
): string {
  if (mode === "units" || !usesStockUnit(product)) {
    return "How many pieces?";
  }
  return stockUnitQuestionLabel(product);
}

export function formatEnteredQuantityPreview(
  entered: number,
  product?: Partial<ProductUnitFields> | null
): string | null {
  if (!usesStockUnit(product) || !Number.isFinite(entered) || entered <= 0) {
    return null;
  }
  const base = stockUnitsToBase(entered, product);
  const label = pluralizeStockUnit(getStockUnitLabel(product), entered);
  return `${entered} ${label} = ${base.toLocaleString()} pieces`;
}

export function splitBaseQuantity(
  baseQty: number,
  product?: Partial<ProductUnitFields> | null
): {
  fullUnits: number;
  loose: number;
  usesStockUnit: boolean;
  unitLabel: string;
  perUnit: number;
} {
  const per = getUnitsPerStockUnit(product);
  const unitLabel = getStockUnitLabel(product);
  const uses = usesStockUnit(product);
  const safeQty = Math.max(0, baseQty);

  if (!uses) {
    return { fullUnits: safeQty, loose: 0, usesStockUnit: false, unitLabel, perUnit: 1 };
  }

  return {
    fullUnits: Math.floor(safeQty / per),
    loose: safeQty % per,
    usesStockUnit: true,
    unitLabel,
    perUnit: per,
  };
}

/** Convert full stock units + loose pieces to base inventory quantity. */
export function stockUnitsAndLooseToBase(
  fullUnits: number,
  loose: number,
  product?: Partial<ProductUnitFields> | null
): number {
  const per = getUnitsPerStockUnit(product);
  return Math.max(0, fullUnits) * per + Math.max(0, loose);
}

export function formatBaseQuantityWithStockUnit(
  baseQty: number,
  product?: Partial<ProductUnitFields> | null
): string {
  const split = splitBaseQuantity(baseQty, product);
  if (!split.usesStockUnit) {
    return `${baseQty.toLocaleString()} pieces`;
  }
  const cartonLabel = pluralizeStockUnit(split.unitLabel, split.fullUnits);
  const cartonPart = `${split.fullUnits.toLocaleString()} ${cartonLabel}`;
  if (split.loose > 0) {
    return `${cartonPart} + ${split.loose.toLocaleString()} loose`;
  }
  return cartonPart;
}
