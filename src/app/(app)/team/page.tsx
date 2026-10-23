import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { withTenant } from "@/db/tenant";
import { workspaceMembers, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const members = await withTenant(
    { userId: session.user.id, workspaceId: session.workspace.id },
    (tx) =>
      tx
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: workspaceMembers.role,
          joinedAt: workspaceMembers.createdAt,
        })
        .from(workspaceMembers)
        .innerJoin(users, eq(workspaceMembers.userId, users.id))
        .where(eq(workspaceMembers.workspaceId, session.workspace.id))
        .orderBy(workspaceMembers.createdAt)
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8 font-sans">
      <div className="space-y-2 border-b border-border pb-4">
        <Badge variant="outline" className="border-primary/40 text-sm text-primary">
          ACCESS CONTROL &amp; RBAC
        </Badge>
        <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">
          Team &amp; Workspace Members
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage member permissions, roles, and collaborative access to reconstructed projects.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <UserCheck className="h-6 w-6" />
              </div>
              <p className="font-semibold text-foreground">No workspace members found</p>
              <p className="text-sm text-muted-foreground">
                Membership rows are created when a user joins this workspace.
              </p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-border md:hidden">
                {members.map((m) => (
                  <li key={m.id} className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <UserCheck className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate font-semibold text-foreground">
                          {m.name || "Member"}
                        </span>
                      </div>
                      <Badge variant={m.role === "owner" ? "default" : "secondary"}>
                        {m.role}
                      </Badge>
                    </div>
                    <p className="break-all font-mono text-sm text-muted-foreground">{m.email}</p>
                    <p className="font-mono text-sm text-muted-foreground">
                      Joined {new Date(m.joinedAt).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr>
                      <th className="p-3 text-start font-semibold">User</th>
                      <th className="p-3 text-start font-semibold">Email</th>
                      <th className="p-3 text-start font-semibold">Workspace Role</th>
                      <th className="p-3 text-start font-semibold">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                        <td className="p-3 font-semibold text-foreground">
                          <span className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-primary" />
                            <span>{m.name || "Member"}</span>
                          </span>
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">{m.email}</td>
                        <td className="p-3">
                          <Badge variant={m.role === "owner" ? "default" : "secondary"}>
                            {m.role}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(m.joinedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
