"use client";

import { StockOutForm } from "@/components/stock/StockOutForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { getPrimaryWarehouseId } from "@/lib/auth/warehouseContext";

export default function WarehouseStockOutPage() {
  const { user } = useAuth();
  const warehouseId = getPrimaryWarehouseId(user) ?? "";

  return (
    <div className="space-y-6 text-zinc-900">
      <PageHeader
        title="Stock out"
        description={`${user?.warehouse?.name ?? "Warehouse"} — record a direct sale to a client.`}
      />
      <StockOutForm
        mode="sell"
        defaultWarehouseId={warehouseId}
        allowedWarehouseIds={warehouseId ? [warehouseId] : undefined}
      />
    </div>
  );
}
