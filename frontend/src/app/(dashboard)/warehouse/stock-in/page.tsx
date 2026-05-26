import { redirect } from "next/navigation";

export default function WarehouseStockInRedirect() {
  redirect("/warehouse/stock?tab=in");
}
