import {
  pluralizeStockUnit,
  splitBaseQuantity,
} from "@/lib/products/productUnits";

type StockQuantityDisplayProps = {
  quantity: number;
  stockUnit?: string;
  unitsPerStockUnit?: number;
  size?: "sm" | "md" | "lg";
  align?: "left" | "center" | "right";
  className?: string;
};

const SIZE = {
  sm: { primary: "text-sm font-semibold", loose: "text-[10px] font-medium text-stone-500" },
  md: { primary: "text-base font-bold", loose: "text-xs font-medium text-stone-500" },
  lg: { primary: "text-lg font-bold", loose: "text-sm font-medium text-stone-500" },
} as const;

const ALIGN = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
} as const;

export function StockQuantityDisplay({
  quantity,
  stockUnit,
  unitsPerStockUnit,
  size = "md",
  align = "left",
  className = "",
}: StockQuantityDisplayProps) {
  const split = splitBaseQuantity(quantity, { stockUnit, unitsPerStockUnit });
  const styles = SIZE[size];

  if (!split.usesStockUnit) {
    return (
      <div className={`flex flex-col tabular-nums ${ALIGN[align]} ${className}`}>
        <span className={`${styles.primary} whitespace-nowrap text-stone-900`}>
          {quantity.toLocaleString()} pieces
        </span>
      </div>
    );
  }

  const cartonLabel = pluralizeStockUnit(split.unitLabel, split.fullUnits);

  return (
    <div className={`flex flex-col gap-0.5 tabular-nums ${ALIGN[align]} ${className}`}>
      <span className={`${styles.primary} whitespace-nowrap text-stone-900`}>
        {split.fullUnits.toLocaleString()} {cartonLabel}
      </span>
      {split.loose > 0 ? (
        <span className={`${styles.loose} whitespace-nowrap`}>
          {split.loose.toLocaleString()} loose
        </span>
      ) : null}
    </div>
  );
}
