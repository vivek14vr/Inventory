"use client";

import { TransferPanel } from "@/components/stock/TransferPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { getPrimaryWarehouseId } from "@/lib/auth/warehouseContext";

export default function WarehouseTransferPage() {
  const { user } = useAuth();
  const warehouseId = getPrimaryWarehouseId(user) ?? "";

  return (
    <div className="space-y-6 text-zinc-900">
      <PageHeader
        title="Transfer"
        description={`${user?.warehouse?.name ?? "Warehouse"} — send stock to another warehouse or receive incoming transfers.`}
      />
      <TransferPanel
        defaultWarehouseId={warehouseId}
        allowedWarehouseIds={warehouseId ? [warehouseId] : undefined}
      />
    </div>
  );
}
