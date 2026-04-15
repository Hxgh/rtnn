import { redirect } from "next/navigation";
import { adminRoutes } from "@/src/lib/admin-routes";

export default function EntryPage() {
  redirect(adminRoutes.dashboard);
}
