"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import type { Brand, Product } from "@/types/master";

type BrandProductFieldsProps = {
  brandId: string;
  productId: string;
  onBrandChange: (brandId: string) => void;
  onProductChange: (productId: string) => void;
  disabled?: boolean;
};

export function BrandProductFields({
  brandId,
  productId,
  onBrandChange,
  onProductChange,
  disabled,
}: BrandProductFieldsProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    api.brands.list().then(setBrands).catch(() => setBrands([]));
  }, []);

  useEffect(() => {
    if (!brandId) {
      setProducts([]);
      setLoadError("");
      return;
    }
    setLoadingProducts(true);
    setLoadError("");
    api.products
      .listAll({ brandId })
      .then((list) => {
        setProducts(list);
        if (list.length === 0) {
          setLoadError("No products for this brand. Create one under Products.");
        }
      })
      .catch((err) => {
        setProducts([]);
        setLoadError(
          err instanceof ApiError ? err.message : "Could not load products"
        );
      })
      .finally(() => setLoadingProducts(false));
  }, [brandId]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="block text-sm font-medium text-zinc-700">Brand</label>
        <select
          required
          disabled={disabled}
          value={brandId}
          onChange={(e) => {
            onBrandChange(e.target.value);
            onProductChange("");
          }}
          className="form-select"
        >
          <option value="">Select brand</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700">Product</label>
        <select
          required
          disabled={disabled || !brandId || loadingProducts}
          value={productId}
          onChange={(e) => onProductChange(e.target.value)}
          className="form-select"
        >
          <option value="">
            {loadingProducts ? "Loading…" : "Select product"}
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {loadError && (
          <p className="mt-1 text-xs text-amber-700">{loadError}</p>
        )}
        {!loadError && brandId && !loadingProducts && products.length > 0 && (
          <p className="mt-1 text-xs text-zinc-500">
            {products.length} product{products.length === 1 ? "" : "s"} available
          </p>
        )}
      </div>
    </div>
  );
}
