"use client";

import { Suspense } from "react";
import { StockOperationsPanel } from "@/components/stock/StockOperationsPanel";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { AUTH_ROUTES } from "@/lib/auth/constants";

function AdminStockContent() {
  return (
    <StockOperationsPanel
      requireWarehouse
      productsHref={AUTH_ROUTES.adminProducts}
    />
  );
}

export default function AdminStockPage() {
  return (
    <div className="space-y-6 text-zinc-900">
      <PageHeader
        title="Stock operations"
        description="Add stock (in) or sell / transfer stock (out) for any warehouse."
      />

      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        }
      >
        <AdminStockContent />
      </Suspense>
    </div>
  );
}
