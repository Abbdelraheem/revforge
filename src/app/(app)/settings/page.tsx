import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 font-sans">
      <div className="space-y-2 border-b border-border pb-4">
        <Badge variant="outline" className="border-primary/40 text-primary text-sm">
          WORKSPACE CONFIGURATION
        </Badge>
        <h1 className="text-3xl font-serif font-bold text-foreground">
          Workspace Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage workspace profile, security credentials, and organization metadata.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-serif">Workspace Details</CardTitle>
          <CardDescription className="text-sm">
            Primary organization identifier and workspace tenant slug.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Workspace Name</label>
            <Input defaultValue={session.workspace.name} disabled className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Workspace Slug</label>
            <Input defaultValue={session.workspace.slug} disabled className="text-sm font-mono" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Account Email</label>
            <Input defaultValue={session.user.email} disabled className="text-sm" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
