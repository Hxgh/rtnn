import { redirect } from "next/navigation";

export default async function LegacyNativeDiagnosticsPage() {
  redirect("/device-services");
}
