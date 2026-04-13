import { redirect } from "next/navigation";
import { adminRoutes } from "@/src/lib/admin-routes";

export default async function RoleEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(adminRoutes.roles.detail(id));
}
