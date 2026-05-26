"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import { api, ApiError } from "@/lib/api/client";
import { Alert } from "@/components/ui/Alert";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { QuickActionCard } from "@/components/ui/QuickActionCard";
import { StatCard } from "@/components/ui/StatCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { InventoryBalance, PendingTransfer } from "@/types/stock";

export default function WarehouseDashboardPage() {
  const { user } = useAuth();
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<PendingTransfer[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [b, t] = await Promise.all([
        api.stock.balances({ page: 1, limit: 100 }),
        api.transfers.pending(),
      ]);
      setBalances(b.items);
      setPendingTransfers(t);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalSkus = balances.length;
  const totalQty = balances.reduce((s, b) => s + b.quantity, 0);
  const warehouseLabel = user?.warehouse
    ? `${user.warehouse.name} (${user.warehouse.code})`
    : "No warehouse assigned";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={warehouseLabel}
        actions={
          <Button variant="secondary" onClick={load} loading={loading}>
            Refresh
          </Button>
        }
      />

      <Alert message={error} />

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner label="Loading…" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Products in stock" value={totalSkus} variant="info" />
            <StatCard
              label="Total units"
              value={totalQty.toLocaleString()}
            />
            <StatCard
              label="Pending transfers"
              value={pendingTransfers.length}
              variant={pendingTransfers.length > 0 ? "warning" : "default"}
              hint={
                pendingTransfers.length > 0
                  ? "Ready to receive via Stock In"
                  : undefined
              }
            />
          </div>

          <Panel title="Today's actions" description="Common warehouse tasks">
            <div className="grid gap-4 sm:grid-cols-2">
              <QuickActionCard
                href={AUTH_ROUTES.warehouseStock}
                title="Stock operations"
                description="Stock in, sell, or transfer to another warehouse"
              />
              <QuickActionCard
                href={AUTH_ROUTES.warehouseInventory}
                title="View inventory"
                description="Current balances at your warehouse"
              />
              <QuickActionCard
                href={AUTH_ROUTES.warehouseTransfers}
                title="Pending transfers"
                description="Incoming transfers to receive"
                badge={
                  pendingTransfers.length > 0
                    ? String(pendingTransfers.length)
                    : undefined
                }
              />
            </div>
          </Panel>

          {balances.length > 0 && (
            <Panel title="Top stock" description="Highest quantities on hand">
              <ul className="space-y-2">
                {[...balances]
                  .sort((a, b) => b.quantity - a.quantity)
                  .slice(0, 5)
                  .map((b) => (
                    <li
                      key={`${b.productId}-${b.brandId}`}
                      className="flex justify-between rounded-lg border border-zinc-100 px-4 py-2.5 text-sm"
                    >
                      <span className="text-zinc-700">
                        {b.productName}{" "}
                        <span className="text-zinc-400">· {b.brandName}</span>
                      </span>
                      <span className="font-semibold tabular-nums text-zinc-900">
                        {b.quantity}
                      </span>
                    </li>
                  ))}
              </ul>
            </Panel>
          )}

          {balances.length === 0 && !error && (
            <EmptyState
              title="No inventory yet"
              description="Record your first Stock In to start tracking balances."
              action={
                <ButtonLink href={AUTH_ROUTES.warehouseStock}>Stock operations</ButtonLink>
              }
            />
          )}
        </>
      )}
    </div>
  );
}
