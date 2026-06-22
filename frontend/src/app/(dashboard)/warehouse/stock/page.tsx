"use client";

import { Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { StockOperationsPanel } from "@/components/stock/StockOperationsPanel";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { getPrimaryWarehouseId } from "@/lib/auth/warehouseContext";

function WarehouseStockContent() {
  const { user } = useAuth();
  const warehouseId = getPrimaryWarehouseId(user) ?? "";

  return (
    <StockOperationsPanel
      defaultWarehouseId={warehouseId}
      allowedWarehouseIds={warehouseId ? [warehouseId] : undefined}
    />
  );
}

export default function WarehouseStockPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 text-zinc-900">
      <PageHeader
        title="Stock operations"
        description={`${user?.warehouse?.name ?? "Warehouse"} — stock in (add) or stock out (sell / transfer)`}
      />

      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        }
      >
        <WarehouseStockContent />
      </Suspense>
    </div>
  );
}
