"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { Alert } from "@/components/ui/Alert";
import { ButtonSelect } from "@/components/ui/ButtonSelect";
import type { Warehouse } from "@/types/master";
import type { TallyImport, TallyImportRow } from "@/types/imports";

export default function AdminImportsPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [history, setHistory] = useState<TallyImport[]>([]);
  const [selected, setSelected] = useState<TallyImport | null>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      setHistory(await api.imports.list());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api.warehouses
      .list(true)
      .then(setWarehouses)
      .catch((err) => {
        setWarehouses([]);
        setError(err instanceof ApiError ? err.message : "Failed to load warehouses");
      });
    loadHistory();
  }, [loadHistory]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !warehouseId) return;

    setUploading(true);
    setError("");
    setSuccess("");
    setSelected(null);

    try {
      const result = await api.imports.uploadTally(file, warehouseId);
      setSelected(result);
      setSuccess(
        `Import complete: ${result.successCount} success, ${result.failedCount} failed, ${result.skippedCount} skipped`
      );
      setFile(null);
      await loadHistory();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function viewImport(id: string) {
    setError("");
    try {
      setSelected(await api.imports.get(id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load import");
    }
  }

  return (
    <div className="space-y-8 text-zinc-900">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Tally Import</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Upload sales report exported from Tally (Excel). Stock is deducted by{" "}
          <strong>Product Name + Brand Name</strong>.
        </p>
      </div>

      <form
        onSubmit={handleUpload}
        className="max-w-xl space-y-4 rounded-xl border border-zinc-200 bg-white p-6"
      >
        <h2 className="font-medium text-zinc-900">Upload report</h2>

        <ButtonSelect
          label="Warehouse (stock deducted from)"
          value={warehouseId}
          onChange={setWarehouseId}
          options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
          emptyMessage="No warehouses available"
        />

        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Excel file (.xlsx)
          </label>
          <input
            type="file"
            required
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full text-sm text-zinc-700"
          />
        </div>

        <div className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
          <p className="font-medium text-zinc-800">Required columns:</p>
          <ul className="mt-1 list-disc pl-4">
            <li>Product Name (or Product)</li>
            <li>Brand Name (or Brand)</li>
            <li>Quantity (or Qty)</li>
          </ul>
          <p className="mt-2">Names must match the system exactly.</p>
        </div>

        <button
          type="submit"
          disabled={uploading || !file}
          className="rounded-lg bg-orange-700 px-4 py-2 text-sm font-medium text-white hover:bg-orange-800 disabled:opacity-60"
        >
          {uploading ? "Importing…" : "Upload & import"}
        </button>
      </form>

      <Alert message={error} />
      <Alert message={success} type="success" />

      {selected && <ImportSummary importData={selected} />}

      <section>
        <h2 className="font-medium text-zinc-900">Import history</h2>
        {loading ? (
          <p className="mt-2 text-sm text-zinc-500">Loading…</p>
        ) : history.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No imports yet</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {history.map((imp) => (
              <li
                key={imp.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm"
              >
                <div className="text-zinc-700">
                  <span className="font-medium text-zinc-900">{imp.fileName}</span>
                  {" · "}
                  {imp.warehouse.name} · {new Date(imp.createdAt).toLocaleString()}
                  <br />
                  <span className="text-zinc-500">
                    ✅ {imp.successCount} · ❌ {imp.failedCount} · ⏭ {imp.skippedCount}
                  </span>
                </div>
                <button
                  onClick={() => viewImport(imp.id)}
                  className="text-orange-700 hover:underline"
                >
                  View details
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ImportSummary({ importData }: { importData: TallyImport }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="font-medium text-zinc-900">Import summary</h2>
      <p className="mt-1 text-sm text-zinc-600">
        {importData.fileName} → {importData.warehouse.name} · by{" "}
        {importData.importedBy.name}
      </p>
      <div className="mt-4 flex gap-4 text-sm">
        <span className="text-orange-700">Success: {importData.successCount}</span>
        <span className="text-red-700">Failed: {importData.failedCount}</span>
        <span className="text-amber-700">Skipped: {importData.skippedCount}</span>
        <span className="text-zinc-500">Total rows: {importData.totalRows}</span>
      </div>
      <ImportRowsTable rows={importData.rows} />
    </div>
  );
}

function ImportRowsTable({ rows }: { rows: TallyImportRow[] }) {
  return (
    <div className="mt-4 max-h-96 overflow-auto rounded-lg border border-zinc-200">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-zinc-50 text-xs uppercase text-zinc-500">
          <tr>
            <th className="px-3 py-2">Product</th>
            <th className="px-3 py-2">Brand</th>
            <th className="px-3 py-2">Qty</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Message</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-zinc-100">
              <td className="px-3 py-2 text-zinc-900">{r.productName}</td>
              <td className="px-3 py-2 text-zinc-600">{r.brandName}</td>
              <td className="px-3 py-2">{r.quantity}</td>
              <td className="px-3 py-2">
                <RowStatus status={r.status} />
              </td>
              <td className="px-3 py-2 text-xs text-zinc-500">{r.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RowStatus({ status }: { status: TallyImportRow["status"] }) {
  const styles = {
    SUCCESS: "text-orange-700",
    FAILED: "text-red-700",
    SKIPPED: "text-amber-700",
  };
  return <span className={`font-medium ${styles[status]}`}>{status}</span>;
}
