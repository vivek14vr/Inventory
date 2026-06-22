"use client";

import { useCallback, useEffect, useState } from "react";
import { StockInForm } from "@/components/stock/StockInForm";
import { StockOutForm } from "@/components/stock/StockOutForm";
import { WarehouseSelect } from "@/components/stock/WarehouseSelect";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { api, ApiError } from "@/lib/api/client";
import type { PendingTransfer } from "@/types/stock";

type Tab = "initiate" | "receive";

export default function AdminReceiveTransfersPage() {
  const [tab, setTab] = useState<Tab>("initiate");
  const [filterWarehouseId, setFilterWarehouseId] = useState("");
  const [transfers, setTransfers] = useState<PendingTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [receiving, setReceiving] = useState<PendingTransfer | null>(null);
  const [transferSuccess, setTransferSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setTransfers(
        await api.transfers.pending(filterWarehouseId || undefined)
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load transfers");
    } finally {
      setLoading(false);
    }
  }, [filterWarehouseId]);

  useEffect(() => {
    if (tab === "receive") {
      load();
    }
  }, [tab, load]);

  return (
    <div className="space-y-6 text-zinc-900">
      <PageHeader
        title="Initiate transfer"
        description="Send stock between warehouses or confirm incoming transfers at the destination."
      />

      <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
        <button
          type="button"
          onClick={() => setTab("initiate")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === "initiate"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          Send transfer
        </button>
        <button
          type="button"
          onClick={() => setTab("receive")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === "receive"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          Receive pending
        </button>
      </div>

      {tab === "initiate" ? (
        <div className="space-y-4">
          <Alert message={transferSuccess} type="success" />
          <StockOutForm
            requireWarehouse
            defaultDispatchType="TRANSFER"
            onSuccess={(message) => {
              setTransferSuccess(message);
              setTab("receive");
            }}
          />
        </div>
      ) : (
        <>
          <div className="max-w-xs rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm">
            <WarehouseSelect
              value={filterWarehouseId}
              onChange={setFilterWarehouseId}
              label="Filter by destination"
              required={false}
            />
            <p className="mt-2 text-xs text-zinc-500">
              Leave empty to show all pending transfers.
            </p>
          </div>

          <Alert message={error} />

          {receiving ? (
            <div className="space-y-4">
              <Button type="button" variant="secondary" size="sm" onClick={() => setReceiving(null)}>
                ← Back to list
              </Button>
              <StockInForm
                requireWarehouse
                transfer={receiving}
                onSuccess={() => {
                  setReceiving(null);
                  load();
                }}
              />
            </div>
          ) : loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : transfers.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center text-sm text-zinc-500">
              No pending transfers to receive.
            </div>
          ) : (
            <div className="space-y-3">
              {transfers.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm"
                >
                  <div>
                    <p className="font-medium text-zinc-900">
                      {t.product.name} · {t.brand.name}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">
                      <span className="font-mono text-xs font-semibold text-zinc-800">
                        {t.sourceWarehouse.code}
                      </span>
                      {" → "}
                      <span className="font-mono text-xs font-semibold text-zinc-800">
                        {t.destinationWarehouse?.code ?? "?"}
                      </span>
                      {" · "}
                      Qty <strong>{t.quantity}</strong>
                    </p>
                    {t.destinationWarehouse && (
                      <p className="mt-0.5 text-xs text-zinc-500">
                        Receive at {t.destinationWarehouse.name}
                      </p>
                    )}
                  </div>
                  <Button type="button" size="sm" onClick={() => setReceiving(t)}>
                    Receive stock
                  </Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
