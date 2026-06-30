import { BadRequestError } from "../errors/AppError.js";
import { normalizeProductName } from "./productName.js";

/** Case-insensitive lookup key for brand + product label (primary or secondary name). */
export function productBrandKey(brandName: string, label: string): string {
  return `${normalizeProductName(brandName)}|${normalizeProductName(label)}`;
}

type ProductWithNames = {
  name: string;
  secondaryName?: string;
};

export function indexProductsByBrandAndLabel<T extends ProductWithNames>(
  products: T[],
  getBrandName: (product: T) => string
): Map<string, T> {
  const map = new Map<string, T>();

  for (const product of products) {
    const brandName = getBrandName(product);
    const primaryKey = productBrandKey(brandName, product.name);
    const existingPrimary = map.get(primaryKey);
    if (existingPrimary && existingPrimary !== product) {
      throw new BadRequestError(
        `Ambiguous product name "${product.name}" for brand "${brandName}". Fix duplicate primary/secondary names before importing.`
      );
    }
    map.set(primaryKey, product);

    const secondary = product.secondaryName?.trim();
    if (secondary) {
      const secondaryKey = productBrandKey(brandName, secondary);
      const existingSecondary = map.get(secondaryKey);
      if (existingSecondary && existingSecondary !== product) {
        throw new BadRequestError(
          `Ambiguous product name "${secondary}" for brand "${brandName}". Fix duplicate primary/secondary names before importing.`
        );
      }
      map.set(secondaryKey, product);
    }
  }

  return map;
}

export function findProductByBrandAndLabel<T extends ProductWithNames>(
  products: T[],
  brandName: string,
  label: string,
  getBrandName: (product: T) => string
): T | undefined {
  const key = productBrandKey(brandName, label);
  const map = indexProductsByBrandAndLabel(products, getBrandName);
  return map.get(key);
}
