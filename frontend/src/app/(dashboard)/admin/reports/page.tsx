"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { Alert } from "@/components/ui/Alert";
import type { Brand, Product, Warehouse } from "@/types/master";
import type { ReportFilters, ReportResult, ReportType } from "@/types/reports";

const REPORT_OPTIONS: { value: ReportType; label: string }[] = [
  { value: "stock", label: "Current stock" },
  { value: "stock-in", label: "Stock In" },
  { value: "stock-out", label: "Stock Out" },
  { value: "transfers", label: "Inter-warehouse transfers" },
  { value: "sales-client", label: "Sales by client" },
  { value: "sales-invoice", label: "Sales by invoice" },
  { value: "sales-brand", label: "Sales by brand" },
];

const COLUMN_MAP: Record<ReportType, string[]> = {
  stock: ["warehouse", "warehouseCode", "product", "brand", "quantity"],
  "stock-in": ["date", "warehouse", "product", "brand", "quantity", "notes"],
  "stock-out": [
    "date",
    "warehouse",
    "product",
    "brand",
    "quantity",
    "dispatchType",
    "destination",
    "clientName",
    "invoiceNumber",
  ],
  transfers: ["date", "status", "product", "brand", "quantity", "from", "to"],
  "sales-client": ["clientName", "totalQuantity", "invoiceCount"],
  "sales-invoice": [
    "date",
    "invoiceNumber",
    "clientName",
    "warehouse",
    "product",
    "brand",
    "quantity",
  ],
  "sales-brand": ["brand", "totalQuantity", "saleCount"],
};

const REPORT_TYPES_WITH_DATES: ReportType[] = [
  "stock-in",
  "stock-out",
  "transfers",
  "sales-client",
  "sales-invoice",
  "sales-brand",
];

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getLast30DaysRange(): Pick<ReportFilters, "dateFrom" | "dateTo"> {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    dateFrom: toDateInputValue(from),
    dateTo: toDateInputValue(to),
  };
}

function dateInputToIso(dateYmd: string, endOfDay = false): string {
  if (endOfDay) {
    return new Date(`${dateYmd}T23:59:59.999`).toISOString();
  }
  return new Date(`${dateYmd}T00:00:00`).toISOString();
}

function filtersForApi(filters: ReportFilters): ReportFilters {
  const next = { ...filters };
  if (next.dateFrom?.length === 10) {
    next.dateFrom = dateInputToIso(next.dateFrom, false);
  }
  if (next.dateTo?.length === 10) {
    next.dateTo = dateInputToIso(next.dateTo, true);
  }
  return next;
}

export default function AdminReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("stock");
  const [filters, setFilters] = useState<ReportFilters>(() => ({
    groupBy: "detail",
    ...getLast30DaysRange(),
  }));
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.warehouses.list(true), api.brands.list()]).then(([w, b]) => {
      setWarehouses(w);
      setBrands(b);
    });
  }, []);

  useEffect(() => {
    if (filters.brandId) {
      api.products.listAll({ brandId: filters.brandId }).then(setProducts);
    } else {
      setProducts([]);
    }
  }, [filters.brandId]);

  const runReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setResult(await api.reports.fetch(reportType, filtersForApi(filters)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to generate report");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [reportType, filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      runReport();
    }, 300);
    return () => clearTimeout(timer);
  }, [reportType, filters, runReport]);

  async function downloadCsv() {
    setExporting(true);
    setError("");
    try {
      await api.reports.downloadCsv(reportType, filtersForApi(filters));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  const columns = getColumns(reportType, result);

  return (
    <div className="space-y-6 text-zinc-900">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Reports</h1>
        <p className="mt-1 text-sm text-zinc-600">
          The table updates automatically when you change filters. Default range is
          the last 30 days (not applied to Current stock).
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-zinc-700">Report type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="mt-1 w-full max-w-md rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
          >
            {REPORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-3">
          <FilterSelect
            label="Warehouse"
            value={filters.warehouseId ?? ""}
            onChange={(v) => setFilters({ ...filters, warehouseId: v || undefined })}
            options={[
              { value: "", label: "All" },
              ...warehouses.map((w) => ({ value: w.id, label: w.name })),
            ]}
          />
          <FilterSelect
            label="Brand"
            value={filters.brandId ?? ""}
            onChange={(v) =>
              setFilters({
                ...filters,
                brandId: v || undefined,
                productId: undefined,
              })
            }
            options={[
              { value: "", label: "All" },
              ...brands.map((b) => ({ value: b.id, label: b.name })),
            ]}
          />
          {(reportType === "stock" ||
            reportType === "stock-in" ||
            reportType === "stock-out") && (
            <FilterSelect
              label="Product"
              value={filters.productId ?? ""}
              onChange={(v) => setFilters({ ...filters, productId: v || undefined })}
              options={[
                { value: "", label: "All" },
                ...products.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          )}
          {reportType === "stock" && (
            <FilterSelect
              label="Group by"
              value={filters.groupBy ?? "detail"}
              onChange={(v) =>
                setFilters({
                  ...filters,
                  groupBy: v as ReportFilters["groupBy"],
                })
              }
              options={[
                { value: "detail", label: "Detail" },
                { value: "warehouse", label: "Warehouse" },
                { value: "brand", label: "Brand" },
                { value: "product", label: "Product" },
              ]}
            />
          )}
          {(reportType.startsWith("sales") || reportType === "stock-out") && (
            <div>
              <label className="block text-xs font-medium text-zinc-500">Client</label>
              <input
                value={filters.clientName ?? ""}
                onChange={(e) =>
                  setFilters({ ...filters, clientName: e.target.value || undefined })
                }
                className="mt-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
                placeholder="Filter client"
              />
            </div>
          )}
          {(reportType.startsWith("sales") || reportType === "stock-out") && (
            <div>
              <label className="block text-xs font-medium text-zinc-500">Invoice</label>
              <input
                value={filters.invoiceNumber ?? ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    invoiceNumber: e.target.value || undefined,
                  })
                }
                className="mt-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
                placeholder="Filter invoice"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-zinc-500">From date</label>
            <input
              type="date"
              value={filters.dateFrom?.slice(0, 10) ?? ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  dateFrom: e.target.value || undefined,
                })
              }
              className="mt-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500">To date</label>
            <input
              type="date"
              value={filters.dateTo?.slice(0, 10) ?? ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  dateTo: e.target.value || undefined,
                })
              }
              className="mt-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
            />
          </div>
          {REPORT_TYPES_WITH_DATES.includes(reportType) && (
            <p className="w-full text-xs text-zinc-500">
              Showing data from {filters.dateFrom?.slice(0, 10) ?? "—"} to{" "}
              {filters.dateTo?.slice(0, 10) ?? "—"}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={downloadCsv}
            disabled={exporting || loading}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            {exporting ? "Exporting…" : "Download CSV"}
          </button>
        </div>
      </div>

      <Alert message={error} />

      {(result || loading) && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <p className="border-b border-zinc-200 px-4 py-3 text-sm text-zinc-600">
            {loading
              ? "Updating report…"
              : `${result?.rows.length ?? 0} row(s)${result?.groupBy ? ` · grouped by ${result.groupBy}` : ""}`}
          </p>
          <div className="max-h-[32rem] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="px-4 py-3">
                      {formatHeader(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={loading ? "opacity-50" : undefined}>
                {!result || result.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-8 text-center text-zinc-500"
                    >
                      No data for selected filters
                    </td>
                  </tr>
                ) : (
                  result!.rows.map((row, i) => (
                    <tr key={i} className="border-t border-zinc-100">
                      {columns.map((col) => (
                        <td key={col} className="px-4 py-2 text-zinc-700">
                          {formatCell(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function getColumns(type: ReportType, result: ReportResult | null): string[] {
  if (!result?.rows.length) return COLUMN_MAP[type];
  const keys = Object.keys(result.rows[0]);
  const preferred = COLUMN_MAP[type].filter((k) => keys.includes(k));
  const rest = keys.filter((k) => !preferred.includes(k));
  return [...preferred, ...rest];
}

function formatHeader(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function formatCell(value: unknown): string {
  if (value == null || value === "") return "—";
  if (value instanceof Date || (typeof value === "string" && value.includes("T"))) {
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
  }
  return String(value);
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900"
      >
        {options.map((o) => (
          <option key={o.value || "all"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
