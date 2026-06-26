import type { Product } from "@/types/master";

type ProductUnitFields = Pick<Product, "stockUnit" | "unitsPerStockUnit">;

export function getUnitsPerStockUnit(product?: ProductUnitFields | null): number {
  const n = product?.unitsPerStockUnit;
  return n && n > 0 ? n : 1;
}

export function getStockUnitLabel(product?: ProductUnitFields | null): string {
  if (getUnitsPerStockUnit(product) === 1) return "unit";
  const label = product?.stockUnit?.trim();
  return label || "unit";
}

export function usesStockUnit(product?: ProductUnitFields | null): boolean {
  return getUnitsPerStockUnit(product) > 1;
}

/** Convert entered stock-unit count (e.g. cartons) to base inventory units. */
export function stockUnitsToBase(
  entered: number,
  product?: ProductUnitFields | null
): number {
  return entered * getUnitsPerStockUnit(product);
}

export function pluralizeStockUnit(label: string, count: number): string {
  if (count === 1) return label;
  const lower = label.toLowerCase();
  if (lower.endsWith("s")) return label;
  return `${label}s`;
}

export function stockUnitQuestionLabel(product?: ProductUnitFields | null): string {
  if (!usesStockUnit(product)) return "How many units?";
  return `How many ${pluralizeStockUnit(getStockUnitLabel(product), 2)}?`;
}

export function formatStockUnitHint(product?: ProductUnitFields | null): string | null {
  if (!usesStockUnit(product)) return null;
  const per = getUnitsPerStockUnit(product);
  const label = getStockUnitLabel(product);
  return `1 ${label} = ${per} units`;
}

export function formatEnteredQuantityPreview(
  entered: number,
  product?: ProductUnitFields | null
): string | null {
  if (!usesStockUnit(product) || !Number.isFinite(entered) || entered <= 0) {
    return null;
  }
  const base = stockUnitsToBase(entered, product);
  const label = pluralizeStockUnit(getStockUnitLabel(product), entered);
  return `${entered} ${label} = ${base.toLocaleString()} units`;
}

export function formatBaseQuantityWithStockUnit(
  baseQty: number,
  product?: ProductUnitFields | null
): string {
  if (!usesStockUnit(product)) {
    return `${baseQty.toLocaleString()} units`;
  }
  const per = getUnitsPerStockUnit(product);
  const label = getStockUnitLabel(product);
  if (baseQty % per === 0) {
    const stockQty = baseQty / per;
    return `${baseQty.toLocaleString()} units (${stockQty} ${pluralizeStockUnit(label, stockQty)})`;
  }
  return `${baseQty.toLocaleString()} units`;
}
