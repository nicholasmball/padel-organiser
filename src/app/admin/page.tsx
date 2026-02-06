import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { checkIsAdmin, getAdminData } from "@/lib/actions/admin";
import { AdminPanel } from "@/components/admin/admin-panel";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const isAdmin = await checkIsAdmin();

  if (!isAdmin) {
    redirect("/");
  }

  const { profiles, blacklist } = await getAdminData();

  return (
    <div className="max-w-2xl">
      <AdminPanel profiles={profiles} blacklist={blacklist} />
    </div>
  );
}
