import { redirect } from "next/navigation";

export default function AdminStockInRedirect() {
  redirect("/admin/stock?tab=in");
}
