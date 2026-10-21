import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { workspaceMembers, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.createdAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, session.workspace.id));

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 font-sans">
      <div className="space-y-2 border-b border-border pb-4">
        <Badge variant="outline" className="border-primary/40 text-primary text-sm">
          ACCESS CONTROL & RBAC
        </Badge>
        <h1 className="text-3xl font-serif font-bold text-foreground">
          Team & Workspace Members
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage member permissions, roles, and collaborative access to reconstructed projects.
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
                  <th className="p-3 text-start font-semibold">Workspace Role</th>
                  <th className="p-3 text-start font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                    <td className="p-3 font-semibold text-foreground flex items-center space-x-2">
                      <UserCheck className="h-4 w-4 text-primary" />
                      <span>{m.name || "Member"}</span>
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
        </CardContent>
      </Card>
    </div>
  );
}
