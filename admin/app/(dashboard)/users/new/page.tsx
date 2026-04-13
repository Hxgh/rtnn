import { redirect } from "next/navigation";
import { adminRoutes } from "@/src/lib/admin-routes";

export default async function UserCreatePage() {
  redirect(adminRoutes.users.list);
}
