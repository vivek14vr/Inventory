import { NotificationsContent } from "@/components/notifications/NotificationsContent";
import { AUTH_ROUTES } from "@/lib/auth/constants";

export default function WarehouseNotificationsPage() {
  return (
    <NotificationsContent checklistsHref={AUTH_ROUTES.warehouseChecklists} />
  );
}
