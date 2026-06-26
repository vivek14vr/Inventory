"use client";

import { ReturnPanel } from "@/components/stock/ReturnPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { getPrimaryWarehouseId } from "@/lib/auth/warehouseContext";

export default function WarehouseReturnPage() {
  const { user } = useAuth();
  const warehouseId = getPrimaryWarehouseId(user) ?? "";

  return (
    <div className="space-y-6 text-zinc-900">
      <PageHeader
        title="Return"
        description={`${user?.warehouse?.name ?? "Warehouse"} — client returns or transfer returns.`}
      />
      <ReturnPanel
        defaultWarehouseId={warehouseId}
        allowedWarehouseIds={warehouseId ? [warehouseId] : undefined}
      />
    </div>
  );
}
