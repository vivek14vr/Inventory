import { redirect } from "next/navigation";

export default function WarehouseStockOutRedirect() {
  redirect("/warehouse/stock?tab=out");
}
