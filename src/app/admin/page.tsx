import { redirect } from "next/navigation";
import { checkIsAdmin, getAdminData } from "@/lib/actions/admin";
import { AdminPanel } from "@/components/admin/admin-panel";

export default async function AdminPage() {
  const isAdmin = await checkIsAdmin();

  if (!isAdmin) {
    redirect("/");
  }

  const { profiles, blacklist } = await getAdminData();

  return (
    <div className="mx-auto max-w-[480px]">
      <AdminPanel profiles={profiles} blacklist={blacklist} />
    </div>
  );
}
