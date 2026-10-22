import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { systemDb } from "@/db";
import { users } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session || session.user.platformRole !== "superadmin") {
    redirect("/login");
  }

  const allUsers = await systemDb
    .select()
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(50);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <div className="space-y-2 border-b border-border pb-4">
        <Badge variant="outline" className="border-primary/40 text-primary text-sm">
          ADMINISTRATION
        </Badge>
        <h1 className="text-3xl font-serif font-bold text-foreground">
          Platform User Management
        </h1>
        <p className="text-sm text-muted-foreground">
          View all registered platform accounts, permissions, and free trial consumption.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="p-3 text-start font-semibold">User</th>
                  <th className="p-3 text-start font-semibold">Email</th>
                  <th className="p-3 text-start font-semibold">Role</th>
                  <th className="p-3 text-start font-semibold">Credits Used</th>
                  <th className="p-3 text-start font-semibold">Verified</th>
                  <th className="p-3 text-start font-semibold">Registered</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                    <td className="p-3 font-semibold text-foreground">{u.name || "User"}</td>
                    <td className="p-3 font-mono text-muted-foreground">{u.email}</td>
                    <td className="p-3">
                      <Badge variant={u.platformRole === "superadmin" ? "default" : "secondary"}>
                        {u.platformRole}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono">{u.analysisCreditsUsed}</td>
                    <td className="p-3">{u.emailVerified ? "Yes" : "No"}</td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
