"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { StockInForm } from "@/components/stock/StockInForm";
import { StockOutForm } from "@/components/stock/StockOutForm";

export type StockOperationTab = "in" | "out";

type StockOperationsPanelProps = {
  requireWarehouse?: boolean;
  defaultWarehouseId?: string;
  allowedWarehouseIds?: string[];
  canStockIn?: boolean;
  canStockOut?: boolean;
  productsHref?: string;
  defaultTab?: StockOperationTab;
};

export function StockOperationsPanel({
  requireWarehouse = false,
  defaultWarehouseId = "",
  allowedWarehouseIds,
  canStockIn = true,
  canStockOut = true,
  productsHref,
  defaultTab = "in",
}: StockOperationsPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: StockOperationTab =
    tabParam === "out" ? "out" : tabParam === "in" ? "in" : defaultTab;
  const tab: StockOperationTab =
    initialTab === "in" && !canStockIn && canStockOut
      ? "out"
      : initialTab === "out" && !canStockOut && canStockIn
        ? "in"
        : initialTab;

  function setTab(next: StockOperationTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-2">
        <div className="flex gap-2">
          {canStockIn && (
            <TabButton active={tab === "in"} onClick={() => setTab("in")}>
              Stock in
            </TabButton>
          )}
          {canStockOut && (
            <TabButton active={tab === "out"} onClick={() => setTab("out")}>
              Stock out
            </TabButton>
          )}
        </div>
        {productsHref && tab === "in" && (
          <Link
            href={productsHref}
            className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
          >
            + New product
          </Link>
        )}
      </div>

      {tab === "in" ? (
        <div>
          <p className="mb-4 text-sm text-zinc-600">
            Add inventory — purchases, returns, or quantity corrections via receipt.
          </p>
          <StockInForm
            requireWarehouse={requireWarehouse}
            defaultWarehouseId={defaultWarehouseId}
            allowedWarehouseIds={allowedWarehouseIds}
          />
        </div>
      ) : (
        <div>
          <p className="mb-4 text-sm text-zinc-600">
            Remove inventory — sell to a client (direct selling) or send to another
            warehouse (transfer).
          </p>
          <StockOutForm
            requireWarehouse={requireWarehouse}
            defaultWarehouseId={defaultWarehouseId}
            allowedWarehouseIds={allowedWarehouseIds}
          />
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-emerald-100 text-emerald-900"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
    >
      {children}
    </button>
  );
}
