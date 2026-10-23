import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShieldCheck, UserRound } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl space-y-8 font-sans">
      <div className="space-y-2 border-b border-border pb-4">
        <Badge variant="outline" className="border-primary/40 text-sm text-primary">
          WORKSPACE CONFIGURATION
        </Badge>
        <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">
          Workspace Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Review workspace identity, account details, and access level. These fields are read-only
          until a workspace update flow is implemented.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="font-serif text-lg">Workspace Details</CardTitle>
          <CardDescription className="text-sm">
            Primary organization identifier and workspace tenant slug.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="workspace-name" className="text-sm font-semibold text-foreground">
              Workspace Name
            </label>
            <Input
              id="workspace-name"
              defaultValue={session.workspace.name}
              disabled
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="workspace-slug" className="text-sm font-semibold text-foreground">
              Workspace Slug
            </label>
            <Input
              id="workspace-slug"
              defaultValue={session.workspace.slug}
              disabled
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="account-email" className="text-sm font-semibold text-foreground">
              Account Email
            </label>
            <Input
              id="account-email"
              defaultValue={session.user.email}
              disabled
              className="text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="font-serif text-lg">Account &amp; Access</CardTitle>
          <CardDescription className="text-sm">
            Values below are read from the current authenticated session.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserRound className="h-4 w-4 text-primary" />
              Workspace role
            </div>
            <p className="mt-1 font-mono text-sm font-semibold capitalize">
              {session.workspace.role}
            </p>
          </div>
          <div className="rounded-md border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Email verification
            </div>
            <p className="mt-1 text-sm font-semibold">
              {session.user.emailVerified ? "Verified" : "Not verified"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
