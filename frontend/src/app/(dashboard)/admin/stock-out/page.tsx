import { redirect } from "next/navigation";

export default function AdminStockOutRedirect() {
  redirect("/admin/stock?tab=out");
}
