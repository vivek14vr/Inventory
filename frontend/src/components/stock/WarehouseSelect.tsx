"use client";

import { useEffect, useState } from "react";
import { ButtonSelect } from "@/components/ui/ButtonSelect";
import { api } from "@/lib/api/client";
import type { Warehouse } from "@/types/master";

type WarehouseSelectProps = {
  value: string;
  onChange: (warehouseId: string) => void;
  label?: string;
  required?: boolean;
  excludeWarehouseId?: string;
  /** When set, only these warehouses appear (module access). */
  allowedWarehouseIds?: string[];
  disabled?: boolean;
};

export function WarehouseSelect({
  value,
  onChange,
  label = "Warehouse",
  required = true,
  excludeWarehouseId,
  allowedWarehouseIds,
  disabled,
}: WarehouseSelectProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    api.warehouses.list().then(setWarehouses).catch(() => setWarehouses([]));
  }, []);

  let options = warehouses;
  if (allowedWarehouseIds?.length) {
    options = options.filter((w) => allowedWarehouseIds.includes(w.id));
  }
  if (excludeWarehouseId) {
    options = options.filter((w) => w.id !== excludeWarehouseId);
  }

  const buttonOptions = [
    ...(required ? [] : [{ value: "", label: "All" }]),
    ...options.map((w) => ({ value: w.id, label: w.name, sublabel: w.code })),
  ];

  return (
    <ButtonSelect
      label={label}
      value={value}
      onChange={onChange}
      options={buttonOptions}
      disabled={disabled}
      emptyMessage="No warehouses available"
    />
  );
}
