"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { Alert } from "@/components/ui/Alert";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/components/ui/DataTable";
import { StatCard } from "@/components/ui/StatCard";
import { usePagination } from "@/hooks/usePagination";
import type { PaginationMeta } from "@/types/pagination";
import type { Brand, Warehouse } from "@/types/master";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FilterField, FilterSelect } from "@/components/ui/FilterFields";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import type {
  LowStockResponse,
  StockLocationLastChange,
  StockProductRow,
  StockResponse,
  StockRow,
} from "@/types/inventory";
import type { StockMovement } from "@/types/stock";

type Tab = "stock" | "movements" | "low-stock";

export default function AdminInventoryPage() {
  const [tab, setTab] = useState<Tab>("stock");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [movementType, setMovementType] = useState("");
  const [search, setSearch] = useState("");
  const [stock, setStock] = useState<StockResponse | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [lowStock, setLowStock] = useState<LowStockResponse | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { page, setPage, limit, setLimit, resetPage, params } = usePagination(20);

  useEffect(() => {
    Promise.all([api.warehouses.list(true), api.brands.list()])
      .then(([w, b]) => {
        setWarehouses(w);
        setBrands(b);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const base = {
        page,
        limit,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(warehouseId ? { warehouseId } : {}),
        ...(brandId ? { brandId } : {}),
      };

      if (tab === "stock") {
        const result = await api.inventory.stock(base);
        setStock(result.data);
        setPagination(result.pagination);
      } else if (tab === "movements") {
        const result = await api.inventory.movements({
          ...base,
          ...(movementType ? { type: movementType } : {}),
        });
        setMovements(result.items);
        setPagination(result.pagination);
        setStock(null);
        setLowStock(null);
      } else {
        const result = await api.inventory.lowStock(base);
        setLowStock(result.data);
        setPagination(result.pagination);
        setStock(null);
        setMovements([]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [tab, warehouseId, brandId, movementType, search, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  function handleFilterChange(setter: (v: string) => void, value: string) {
    setter(value);
    resetPage();
  }

  function handleTabChange(next: Tab) {
    setTab(next);
    resetPage();
  }

  return (
    <div className="space-y-6 text-zinc-900">
      <PageHeader
        title="Inventory & stock"
        description="View levels, add stock, sell, transfer, or correct quantities."
        actions={
          <ButtonLink href={AUTH_ROUTES.adminStockIn} size="sm">
            Stock in
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {(
          [
            ["stock", "Current stock"],
            ["movements", "Movements"],
            ["low-stock", "Low stock"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => handleTabChange(key)}
            className={`min-h-14 rounded-2xl border-2 px-5 py-3.5 text-base font-bold transition active:scale-[0.98] ${
              tab === key
                ? "border-orange-600 bg-orange-600 text-white shadow-md shadow-orange-900/20"
                : "border-stone-200 bg-white text-stone-700 hover:border-orange-300 hover:bg-orange-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm">
        <FilterField label="Search">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            placeholder="Product, brand, warehouse…"
            className="w-full min-w-[200px] rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </FilterField>
        <FilterSelect
          label="Warehouse"
          value={warehouseId}
          onChange={(v) => handleFilterChange(setWarehouseId, v)}
          options={[
            { value: "", label: "All" },
            ...warehouses.map((w) => ({ value: w.id, label: w.name })),
          ]}
        />
        <FilterSelect
          label="Brand"
          value={brandId}
          onChange={(v) => handleFilterChange(setBrandId, v)}
          options={[
            { value: "", label: "All" },
            ...brands.map((b) => ({ value: b.id, label: b.name })),
          ]}
        />
        {tab === "movements" && (
          <FilterSelect
            label="Type"
            value={movementType}
            onChange={(v) => handleFilterChange(setMovementType, v)}
            options={[
              { value: "", label: "All" },
              { value: "STOCK_IN", label: "Stock In" },
              { value: "STOCK_OUT", label: "Stock Out" },
            ]}
          />
        )}
      </div>

      <Alert message={error} />
      {success ? <Alert message={success} type="success" /> : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : tab === "stock" && stock ? (
        <StockView
          data={stock}
          onUpdated={() => {
            setSuccess("Stock quantity updated");
            load();
          }}
          onError={(msg) => setError(msg)}
        />
      ) : tab === "movements" ? (
        <MovementsView movements={movements} />
      ) : tab === "low-stock" && lowStock ? (
        <LowStockView data={lowStock} />
      ) : null}

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

function LastChangeCell({ change }: { change?: StockLocationLastChange | null }) {
  if (!change) {
    return <span className="text-base font-medium text-stone-300">—</span>;
  }

  const isIn = change.type === "STOCK_IN";
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums ${
          isIn ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
        }`}
      >
        {isIn ? "+" : "−"}
        {change.quantity.toLocaleString()}
      </span>
      <span className="text-[10px] font-medium text-stone-400">
        {new Date(change.createdAt).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        })}
      </span>
    </div>
  );
}

function toStockRow(product: StockProductRow, loc: StockProductRow["locations"][number]): StockRow {
  return {
    warehouseId: loc.warehouseId,
    warehouseName: loc.warehouseName,
    warehouseCode: loc.warehouseCode,
    productId: product.productId,
    productName: product.productName,
    brandId: product.brandId,
    brandName: product.brandName,
    quantity: loc.quantity,
    updatedAt: loc.updatedAt,
  };
}

function StockView({
  data,
  onUpdated,
  onError,
}: {
  data: StockResponse;
  onUpdated: () => void;
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState<StockRow | null>(null);
  const warehouseColumns = data.warehouses?.length
    ? data.warehouses
    : data.summary.byWarehouse.map((w) => ({
        warehouseId: w.warehouseId,
        name: w.name,
        code: w.code,
      }));
  const products = data.products ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total units" value={data.summary.totalUnits.toLocaleString()} />
        <StatCard label="Products" value={data.summary.totalSkus} variant="info" />
        <StatCard
          label="Warehouses"
          value={data.summary.byWarehouse.length}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-orange-50 text-xs font-bold uppercase tracking-wide text-orange-800">
                <th className="sticky left-0 z-10 bg-orange-50 px-5 py-3.5 text-left">
                  Product
                </th>
                <th className="px-5 py-3.5 text-left">Brand</th>
                {warehouseColumns.map((wh) => (
                  <Fragment key={wh.warehouseId}>
                    <th className="px-5 py-3.5 text-center">
                      <div className="font-bold">{wh.name}</div>
                      <div className="mt-0.5 text-[10px] font-semibold normal-case tracking-normal text-orange-600/80">
                        {wh.code}
                      </div>
                    </th>
                    <th className="px-5 py-3.5 text-center">
                      <div className="font-bold">Last change</div>
                      <div className="mt-0.5 text-[10px] font-semibold normal-case tracking-normal text-orange-600/80">
                        {wh.code}
                      </div>
                    </th>
                  </Fragment>
                ))}
                <th className="px-5 py-3.5 text-right">Total</th>
                <th className="px-5 py-3.5 text-left">Last updated</th>
                <th className="sticky right-0 z-10 bg-orange-50 px-5 py-3.5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td
                    colSpan={warehouseColumns.length * 2 + 5}
                    className="px-5 py-10 text-center text-base font-medium text-stone-400"
                  >
                    No stock on hand
                  </td>
                </tr>
              ) : (
                products.map((product, index) => {
                  const locationByWarehouse = new Map(
                    product.locations.map((loc) => [loc.warehouseId, loc])
                  );
                  const stockedLocations = product.locations.filter((loc) => loc.quantity > 0);
                  const lastUpdated = product.locations.reduce<string | null>((latest, loc) => {
                    if (!latest || new Date(loc.updatedAt) > new Date(latest)) {
                      return loc.updatedAt;
                    }
                    return latest;
                  }, null);
                  return (
                    <tr
                      key={product.productId}
                      className={`border-t border-stone-100 transition-colors hover:bg-orange-50/50 ${
                        index % 2 === 0 ? "bg-white" : "bg-stone-50/40"
                      }`}
                    >
                      <td className="sticky left-0 z-10 bg-inherit px-5 py-3.5 font-semibold text-stone-900">
                        {stockedLocations[0] ? (
                          <ButtonLink
                            href={AUTH_ROUTES.adminInventoryItem(
                              stockedLocations[0].warehouseId,
                              product.productId
                            )}
                            variant="ghost"
                            size="sm"
                            className="!h-auto !min-h-0 !px-0 !py-0 !text-base !font-semibold !text-stone-900 hover:!text-orange-800 hover:!underline"
                          >
                            {product.productName}
                          </ButtonLink>
                        ) : (
                          product.productName
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-stone-600">{product.brandName}</td>
                      {warehouseColumns.map((wh) => {
                        const loc = locationByWarehouse.get(wh.warehouseId);
                        return (
                          <Fragment key={wh.warehouseId}>
                            <td className="px-5 py-3.5 text-center">
                              {loc ? (
                                <span className="text-lg font-bold tabular-nums text-stone-900">
                                  {loc.quantity.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-base font-medium text-stone-300">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <LastChangeCell change={loc?.lastChange} />
                            </td>
                          </Fragment>
                        );
                      })}
                      <td className="px-5 py-3.5 text-right text-lg font-bold tabular-nums text-orange-800">
                        {product.totalQuantity.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-sm text-stone-500">
                        {lastUpdated
                          ? new Date(lastUpdated).toLocaleString("en-IN", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "—"}
                      </td>
                      <td className="sticky right-0 z-10 bg-inherit px-5 py-3.5 text-right">
                        <div className="flex flex-col items-end gap-2">
                          <ButtonLink
                            href={AUTH_ROUTES.adminReturn}
                            variant="outline"
                            size="sm"
                            className="!min-h-8 !border-emerald-200 !text-emerald-800 hover:!bg-emerald-50"
                          >
                            Return
                          </ButtonLink>
                          {product.locations.map((loc) => {
                            const stockRow = toStockRow(product, loc);
                            return (
                              <div
                                key={loc.warehouseId}
                                className="flex flex-wrap items-center justify-end gap-1.5"
                              >
                                <span className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                                  {loc.warehouseCode}
                                </span>
                                <ButtonLink
                                  href={AUTH_ROUTES.adminInventoryItem(
                                    loc.warehouseId,
                                    product.productId
                                  )}
                                  variant="ghost"
                                  size="sm"
                                  className="!min-h-8 !px-2 !py-1 !text-xs"
                                >
                                  History
                                </ButtonLink>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="!min-h-8 !px-2 !py-1 !text-xs"
                                  onClick={() => setEditing(stockRow)}
                                >
                                  Update
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <AdjustStockDialog
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={onUpdated}
          onError={onError}
        />
      )}
    </div>
  );
}

function AdjustStockDialog({
  row,
  onClose,
  onSaved,
  onError,
}: {
  row: StockRow;
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [quantity, setQuantity] = useState(String(row.quantity));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (Number.isNaN(qty) || qty < 0) {
      onError("Enter a valid quantity (0 or greater)");
      return;
    }
    if (reason.trim().length < 3) {
      onError("Reason must be at least 3 characters");
      return;
    }

    setSaving(true);
    onError("");
    try {
      await api.inventory.adjustStock({
        warehouseId: row.warehouseId,
        productId: row.productId,
        brandId: row.brandId,
        quantity: qty,
        reason: reason.trim(),
      });
      onSaved();
      onClose();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Failed to update stock");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adjust-stock-title"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="adjust-stock-title" className="text-lg font-semibold text-zinc-900">
          Update stock quantity
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          {row.productName} · {row.brandName} · {row.warehouseName}
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Current: <strong className="text-zinc-900">{row.quantity}</strong> units
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600">New quantity</label>
            <input
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="form-input mt-1 w-full"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600">
              Reason (required for audit)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Physical count correction, damaged goods write-off"
              className="form-input mt-1 w-full resize-y"
              required
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={saving}>
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}

function MovementsView({ movements }: { movements: StockMovement[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
      <DataTable>
        <DataTableHead>
          <DataTableTh>Date</DataTableTh>
          <DataTableTh>Type</DataTableTh>
          <DataTableTh>Product</DataTableTh>
          <DataTableTh>Brand</DataTableTh>
          <DataTableTh>Warehouse</DataTableTh>
          <DataTableTh>Details</DataTableTh>
          <DataTableTh align="right">Qty</DataTableTh>
        </DataTableHead>
        <DataTableBody>
          {movements.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                No movements
              </td>
            </tr>
          ) : (
            movements.map((m) => (
              <DataTableRow key={m.id}>
                <DataTableTd className="whitespace-nowrap text-zinc-500">
                  {new Date(m.createdAt).toLocaleString("en-IN", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </DataTableTd>
                <DataTableTd>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      m.type === "STOCK_IN"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {m.type === "STOCK_IN" ? "Stock In" : "Stock Out"}
                  </span>
                </DataTableTd>
                <DataTableTd className="font-medium">{m.product?.name}</DataTableTd>
                <DataTableTd className="text-zinc-600">{m.brand?.name}</DataTableTd>
                <DataTableTd>{m.warehouse?.code}</DataTableTd>
                <DataTableTd className="max-w-xs truncate text-xs text-zinc-500">
                  {m.dispatchType === "TRANSFER" &&
                    `Transfer → ${m.destinationWarehouse?.code}`}
                  {m.dispatchType === "DIRECT_SELLING" &&
                    `${m.clientName} · ${m.invoiceNumber}`}
                </DataTableTd>
                <DataTableTd align="right" className="font-semibold tabular-nums">
                  {m.quantity}
                </DataTableTd>
              </DataTableRow>
            ))
          )}
        </DataTableBody>
      </DataTable>
    </div>
  );
}

function LowStockView({ data }: { data: LowStockResponse }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">
        Items with quantity ≤ <strong>{data.threshold}</strong> —{" "}
        <strong>{data.count}</strong> total matching filters
      </p>
      <div className="overflow-hidden rounded-2xl border border-amber-200/80 bg-amber-50/30 shadow-sm">
        <DataTable>
          <DataTableHead>
            <DataTableTh>Warehouse</DataTableTh>
            <DataTableTh>Product</DataTableTh>
            <DataTableTh>Brand</DataTableTh>
            <DataTableTh align="right">Quantity</DataTableTh>
          </DataTableHead>
          <DataTableBody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-zinc-600">
                  No low-stock items
                </td>
              </tr>
            ) : (
              data.items.map((r) => (
                <DataTableRow key={`${r.warehouseId}-${r.productId}`}>
                  <DataTableTd>
                    {r.warehouseName} ({r.warehouseCode})
                  </DataTableTd>
                  <DataTableTd className="font-medium">{r.productName}</DataTableTd>
                  <DataTableTd>{r.brandName}</DataTableTd>
                  <DataTableTd align="right" className="font-semibold text-amber-800">
                    {r.quantity}
                  </DataTableTd>
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
      </div>
    </div>
  );
}
