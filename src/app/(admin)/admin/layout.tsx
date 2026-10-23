import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminShell } from "@/components/layout/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || session.user.platformRole !== "superadmin") {
    redirect("/dashboard");
  }

  return (
    <AdminShell
      displayName={session.user.name || session.user.email}
      email={session.user.email}
    >
      {children}
    </AdminShell>
  );
}
