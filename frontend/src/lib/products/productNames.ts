import type { Product } from "@/types/master";

export function formatSecondaryName(value?: string | null): string {
  const text = value?.trim();
  return text || "—";
}

export function productPickerSubtitle(product: Pick<Product, "secondaryName" | "stockUnit" | "unitsPerStockUnit">): string | undefined {
  const parts: string[] = [];
  if (product.secondaryName?.trim()) {
    parts.push(product.secondaryName.trim());
  }
  if (product.unitsPerStockUnit > 1) {
    parts.push(`${product.unitsPerStockUnit} pieces = 1 ${product.stockUnit}`);
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function matchesProductSearch(
  product: Pick<Product, "name" | "secondaryName">,
  term: string
): boolean {
  const query = term.trim().toLowerCase();
  if (!query) return true;
  if (product.name.toLowerCase().includes(query)) return true;
  if (product.secondaryName?.toLowerCase().includes(query)) return true;
  return false;
}
