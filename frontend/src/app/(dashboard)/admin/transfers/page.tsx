"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/components/ui/DataTable";
import { FilterSelect } from "@/components/ui/FilterFields";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { usePagination } from "@/hooks/usePagination";
import type { PaginationMeta } from "@/types/pagination";
import type { Warehouse } from "@/types/master";
import type { TransferRecord } from "@/types/stock";

type PendingAction = {
  transfer: TransferRecord;
  status: "RECEIVED" | "RETURNED";
};

export default function AdminTransfersPage() {
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [status, setStatus] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [destId, setDestId] = useState("");
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const { page, setPage, limit, setLimit, resetPage } = usePagination(20);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [history, wh] = await Promise.all([
        api.transfers.history({
          page,
          limit,
          ...(status ? { status } : {}),
          ...(sourceId ? { sourceWarehouseId: sourceId } : {}),
          ...(destId ? { destinationWarehouseId: destId } : {}),
        }),
        api.warehouses.list(true),
      ]);
      setTransfers(history.items);
      setPagination(history.pagination);
      setWarehouses(wh);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load transfer history");
    } finally {
      setLoading(false);
    }
  }, [status, sourceId, destId, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmStatusUpdate() {
    if (!pendingAction) return;
    const { transfer, status: nextStatus } = pendingAction;
    setUpdatingId(transfer.id);
    setError("");
    setSuccess("");
    try {
      await api.transfers.updateStatus(transfer.id, { status: nextStatus });
      setSuccess(
        nextStatus === "RECEIVED"
          ? "Transfer marked as received"
          : `${transfer.quantity} units returned to ${transfer.sourceWarehouse.name}; source warehouse restocked.`
      );
      setPendingAction(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update transfer");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6 text-zinc-900">
      <PageHeader
        title="Transfer history"
        description="Track inter-warehouse transfers. Pending items can be received or marked as returned to restock the sending warehouse."
      />

      <div className="flex flex-wrap gap-3 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm">
        <FilterSelect
          label="Status"
          value={status}
          onChange={(v) => {
            setStatus(v);
            resetPage();
          }}
          options={[
            { value: "", label: "All statuses" },
            { value: "PENDING", label: "Pending" },
            { value: "RECEIVED", label: "Received" },
            { value: "RETURNED", label: "Returned" },
            { value: "CANCELLED", label: "Cancelled" },
          ]}
        />
        <FilterSelect
          label="From warehouse"
          value={sourceId}
          onChange={(v) => {
            setSourceId(v);
            resetPage();
          }}
          options={[
            { value: "", label: "All sources" },
            ...warehouses.map((w) => ({ value: w.id, label: w.name })),
          ]}
        />
        <FilterSelect
          label="To warehouse"
          value={destId}
          onChange={(v) => {
            setDestId(v);
            resetPage();
          }}
          options={[
            { value: "", label: "All destinations" },
            ...warehouses.map((w) => ({ value: w.id, label: w.name })),
          ]}
        />
      </div>

      <Alert message={error} />
      {success ? <Alert message={success} type="success" /> : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
          <DataTable>
            <DataTableHead>
              <DataTableTh>Date</DataTableTh>
              <DataTableTh>Product</DataTableTh>
              <DataTableTh>Brand</DataTableTh>
              <DataTableTh align="right">Qty</DataTableTh>
              <DataTableTh>Route</DataTableTh>
              <DataTableTh>Status</DataTableTh>
              <DataTableTh>By</DataTableTh>
              <DataTableTh align="right">Actions</DataTableTh>
            </DataTableHead>
            <DataTableBody>
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                    No transfers found
                  </td>
                </tr>
              ) : (
                transfers.map((t) => (
                  <DataTableRow key={t.id}>
                    <DataTableTd className="whitespace-nowrap text-zinc-500">
                      {new Date(t.createdAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </DataTableTd>
                    <DataTableTd className="font-medium text-zinc-900">
                      {t.product.name}
                    </DataTableTd>
                    <DataTableTd className="text-zinc-600">{t.brand.name}</DataTableTd>
                    <DataTableTd align="right" className="font-semibold tabular-nums">
                      {t.quantity.toLocaleString()}
                    </DataTableTd>
                    <DataTableTd>
                      <span className="inline-flex items-center gap-1.5 text-sm text-zinc-700">
                        <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-800">
                          {t.sourceWarehouse.code}
                        </span>
                        <span className="text-zinc-400" aria-hidden>
                          →
                        </span>
                        <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-800">
                          {t.destinationWarehouse.code}
                        </span>
                      </span>
                    </DataTableTd>
                    <DataTableTd>
                      <StatusBadge status={t.status} />
                    </DataTableTd>
                    <DataTableTd className="text-xs text-zinc-500">
                      <span className="block">{t.createdBy?.name ?? "—"}</span>
                      {t.receivedBy && (
                        <span className="mt-0.5 block text-orange-700">
                          Received by {t.receivedBy.name}
                        </span>
                      )}
                      {t.returnedBy && (
                        <span className="mt-0.5 block text-violet-700">
                          Returned by {t.returnedBy.name}
                        </span>
                      )}
                    </DataTableTd>
                    <DataTableTd align="right" className="!pr-4">
                      {t.status === "PENDING" ? (
                        <div className="inline-flex flex-nowrap items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={updatingId !== null}
                            onClick={() =>
                              setPendingAction({ transfer: t, status: "RECEIVED" })
                            }
                          >
                            Receive
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            disabled={updatingId !== null}
                            onClick={() =>
                              setPendingAction({ transfer: t, status: "RETURNED" })
                            }
                          >
                            Returned
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400">No actions</span>
                      )}
                    </DataTableTd>
                  </DataTableRow>
                ))
              )}
            </DataTableBody>
          </DataTable>
        </div>
      )}

      {pagination && !loading && (
        <Pagination
          pagination={pagination}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      )}

      {pendingAction && (
        <ConfirmDialog
          title={
            pendingAction.status === "RECEIVED"
              ? "Mark transfer as received?"
              : "Mark goods as returned?"
          }
          description={
            pendingAction.status === "RECEIVED"
              ? `${pendingAction.transfer.quantity} units of ${pendingAction.transfer.product.name} will be added to ${pendingAction.transfer.destinationWarehouse.name}.`
              : `${pendingAction.transfer.quantity} units will be restored to ${pendingAction.transfer.sourceWarehouse.name}. The transfer will be marked as returned.`
          }
          confirmLabel={
            pendingAction.status === "RECEIVED" ? "Mark received" : "Confirm returned"
          }
          variant={pendingAction.status === "RECEIVED" ? "primary" : "danger"}
          loading={updatingId === pendingAction.transfer.id}
          onCancel={() => setPendingAction(null)}
          onConfirm={confirmStatusUpdate}
        />
      )}
    </div>
  );
}
