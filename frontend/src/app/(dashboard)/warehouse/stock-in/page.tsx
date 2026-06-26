"use client";

import { StockInForm } from "@/components/stock/StockInForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { getPrimaryWarehouseId } from "@/lib/auth/warehouseContext";

export default function WarehouseStockInPage() {
  const { user } = useAuth();
  const warehouseId = getPrimaryWarehouseId(user) ?? "";

  return (
    <div className="space-y-6 text-zinc-900">
      <PageHeader
        title="Stock in"
        description={`${user?.warehouse?.name ?? "Warehouse"} — add stock by brand and product.`}
      />
      <StockInForm
        defaultWarehouseId={warehouseId}
        allowedWarehouseIds={warehouseId ? [warehouseId] : undefined}
      />
    </div>
  );
}
