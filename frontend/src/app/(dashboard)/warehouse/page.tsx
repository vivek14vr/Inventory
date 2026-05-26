"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import {
  canViewPendingTransfers,
  canViewStockDashboard,
  getPrimaryWarehouseId,
  getWarehouseLabel,
} from "@/lib/auth/warehouseContext";
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

function stockRoutes() {
  return {
    stock: AUTH_ROUTES.appStock,
    inventory: AUTH_ROUTES.appInventory,
    transfers: AUTH_ROUTES.appTransfers,
  };
}

export default function WarehouseDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<PendingTransfer[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const warehouseId = getPrimaryWarehouseId(user);
  const routes = stockRoutes();
  const showStock = canViewStockDashboard(user);
  const showTransfers = canViewPendingTransfers(user);

  const load = useCallback(async () => {
    if (authLoading) return;

    setLoading(true);
    setError("");

    if (!showStock && !showTransfers) {
      setBalances([]);
      setPendingTransfers([]);
      setLoading(false);
      return;
    }

    try {
      const tasks: Promise<void>[] = [];

      if (showStock) {
        tasks.push(
          api.stock
            .balances({
              page: 1,
              limit: 100,
              ...(warehouseId ? { warehouseId } : {}),
            })
            .then((b) => setBalances(b.items))
        );
      } else {
        setBalances([]);
      }

      if (showTransfers) {
        tasks.push(
          api.transfers
            .pending(warehouseId)
            .then((t) => setPendingTransfers(t))
        );
      } else {
        setPendingTransfers([]);
      }

      await Promise.all(tasks);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load data";
      setError(message);
      setBalances([]);
      setPendingTransfers([]);
    } finally {
      setLoading(false);
    }
  }, [authLoading, showStock, showTransfers, warehouseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalSkus = balances.length;
  const totalQty = balances.reduce((s, b) => s + b.quantity, 0);
  const warehouseLabel = getWarehouseLabel(user, authLoading);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={warehouseLabel}
        actions={
          <Button variant="secondary" onClick={() => void load()} loading={loading}>
            Refresh
          </Button>
        }
      />

      <Alert message={error} />

      {!authLoading && !warehouseId && (
        <Alert message="Your account has no warehouse linked. Ask an admin to assign a warehouse or stock permissions." />
      )}

      {authLoading || loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner label="Loading…" />
        </div>
      ) : !showStock && !showTransfers ? (
        <EmptyState
          title="Dashboard access only"
          description="You can open other sections from the menu. Stock and transfer stats need stock or transfer permissions."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {showStock && (
              <>
                <StatCard label="Products in stock" value={totalSkus} variant="info" />
                <StatCard label="Total units" value={totalQty.toLocaleString()} />
              </>
            )}
            {showTransfers && (
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
            )}
          </div>

          <Panel title="Today's actions" description="Common warehouse tasks">
            <div className="grid gap-4 sm:grid-cols-2">
              {showStock && (
                <>
                  <QuickActionCard
                    href={routes.stock}
                    title="Stock operations"
                    description="Stock in, sell, or transfer to another warehouse"
                  />
                  <QuickActionCard
                    href={routes.inventory}
                    title="View inventory"
                    description="Current balances at your warehouse"
                  />
                </>
              )}
              {showTransfers && (
                <QuickActionCard
                  href={routes.transfers}
                  title="Pending transfers"
                  description="Incoming transfers to receive"
                  badge={
                    pendingTransfers.length > 0
                      ? String(pendingTransfers.length)
                      : undefined
                  }
                />
              )}
            </div>
          </Panel>

          {showStock && balances.length > 0 && (
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

          {showStock && balances.length === 0 && !error && warehouseId && (
            <EmptyState
              title="No inventory yet"
              description="Record your first Stock In to start tracking balances."
              action={<ButtonLink href={routes.stock}>Stock operations</ButtonLink>}
            />
          )}
        </>
      )}
    </div>
  );
}
