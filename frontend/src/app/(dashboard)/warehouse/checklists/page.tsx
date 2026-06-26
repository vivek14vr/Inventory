import { ChecklistsTodayContent } from "@/components/checklists/ChecklistsTodayContent";
import { AUTH_ROUTES } from "@/lib/auth/constants";

export default function WarehouseChecklistsPage() {
  return (
    <ChecklistsTodayContent notificationsHref={AUTH_ROUTES.warehouseNotifications} />
  );
}
