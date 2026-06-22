"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { Alert } from "@/components/ui/Alert";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { usePagination } from "@/hooks/usePagination";
import type { PaginationMeta } from "@/types/pagination";
import type { Brand, Product } from "@/types/master";

const emptyForm = { name: "", brandId: "", editId: null as string | null };

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filterBrandId, setFilterBrandId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const { page, setPage, limit, setLimit, resetPage } = usePagination(20);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productResult, brandList] = await Promise.all([
        api.products.list({
          includeInactive: true,
          brandId: filterBrandId || undefined,
          page,
          limit,
          ...(search.trim() ? { search: search.trim() } : {}),
        }),
        api.brands.list(),
      ]);
      setProducts(productResult.items);
      setPagination(productResult.pagination);
      setBrands(brandList);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [filterBrandId, page, limit, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      if (form.editId) {
        await api.products.update(form.editId, {
          name: form.name,
          brandId: form.brandId,
        });
        setSuccess("Product updated");
      } else {
        await api.products.create({
          name: form.name,
          brandId: form.brandId,
        });
        setSuccess("Product created");
      }
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save product");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(item: Product) {
    setError("");
    try {
      await api.products.update(item.id, { isActive: !item.isActive });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update product");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Products</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Unique inventory key: <strong>Product Name + Brand Name</strong>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div>
          <label className="text-sm font-medium text-zinc-700">Search</label>
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            placeholder="Product name…"
            className="ml-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700">Filter by brand</label>
          <select
            value={filterBrandId}
            onChange={(e) => {
              setFilterBrandId(e.target.value);
              resetPage();
            }}
            className="ml-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setForm(emptyForm);
          }}
          className="rounded-lg bg-orange-700 px-4 py-2 text-sm font-medium text-white hover:bg-orange-800"
        >
          {showForm ? "Cancel" : "Add product"}
        </button>
      </div>

      <Alert message={error} />
      <Alert message={success} type="success" />

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4"
        >
          <h2 className="font-medium text-zinc-900">{form.editId ? "Edit product" : "New product"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Product name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="e.g. 200ml Glass"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Brand</label>
              <select
                required
                value={form.brandId}
                onChange={(e) => setForm({ ...form, brandId: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="">Select brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting || brands.length === 0}
            className="rounded-lg bg-orange-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
          {brands.length === 0 && (
            <p className="text-sm text-amber-700">Create at least one brand first.</p>
          )}
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  No products
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-t border-zinc-100">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{p.brand.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge active={p.isActive} />
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button
                      onClick={() => {
                        setForm({
                          name: p.name,
                          brandId: p.brandId,
                          editId: p.id,
                        });
                        setShowForm(true);
                      }}
                      className="text-xs text-zinc-600 hover:text-zinc-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(p)}
                      className="text-xs text-zinc-600 hover:text-zinc-900"
                    >
                      {p.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && !loading && (
        <Pagination
          pagination={pagination}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      )}
    </div>
  );
}
