import { redirect } from "next/navigation";
import { adminRoutes } from "@/src/lib/admin-routes";

export default async function RoleCreatePage() {
  redirect(adminRoutes.roles.list);
}
