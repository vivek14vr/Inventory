import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import type { AdminDashboard } from "@/types/inventory";

type LowStockReportPanelProps = {
  items: AdminDashboard["lowStockItems"];
  threshold: number;
  totalCount: number;
};

export function LowStockReportPanel({
  items,
  threshold,
  totalCount,
}: LowStockReportPanelProps) {
  return (
    <Panel
      title="Low stock report"
      description={`Items at or below ${threshold} units`}
      action={
        <Link
          href={AUTH_ROUTES.adminInventory}
          className="text-sm font-medium text-orange-700 hover:text-orange-800"
        >
          View inventory
        </Link>
      }
    >
      {items.length === 0 ? (
        <EmptyState
          title="All stock levels healthy"
          description={`No items are at or below the ${threshold}-unit threshold.`}
        />
      ) : (
        <div className="space-y-3">
          <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-100">
            {items.map((item) => (
              <li
                key={`${item.warehouseId}-${item.productId}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900">
                    {item.productName}
                    <span className="font-normal text-zinc-500"> · {item.brandName}</span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    {item.warehouseName}{" "}
                    <span className="font-mono">({item.warehouseCode})</span>
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold tabular-nums text-amber-900">
                  {item.quantity} left
                </span>
              </li>
            ))}
          </ul>
          {totalCount > items.length ? (
            <p className="text-xs text-zinc-500">
              Showing top {items.length} of {totalCount} low-stock items.
            </p>
          ) : null}
        </div>
      )}
    </Panel>
  );
}
