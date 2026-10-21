import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderGit2, Plus, ArrowRight, Clock, ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default async function ProjectsListPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const workspaceProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.workspaceId, session.workspace.id))
    .orderBy(desc(projects.createdAt));

  return (
    <div className="space-y-8 font-sans text-foreground">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-foreground">
            Projects
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            All reverse engineering targets and reconstructed applications in {session.workspace.name}
          </p>
        </div>
        <div>
          <Button asChild className="text-sm font-semibold h-10 shadow-sm">
            <Link href="/projects/new">
              <Plus className="me-2 h-4 w-4" />
              <span>New Analysis</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Projects List */}
      <Card className="border-border bg-card shadow-sm overflow-hidden">
        {workspaceProjects.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <FolderGit2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">No projects found</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Submit your first target URL, Android APK, or binary to start the clean-room analysis pipeline.
              </p>
            </div>
            <Button asChild size="sm" className="font-semibold shadow-sm">
              <Link href="/projects/new">
                <Plus className="me-1.5 h-3.5 w-3.5" />
                <span>Create New Project</span>
              </Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {workspaceProjects.map((p) => (
              <div
                key={p.id}
                className="p-5 flex items-center justify-between hover:bg-muted/20 transition-colors"
              >
                <div className="space-y-1.5">
                  <Link
                    href={`/projects/${p.id}`}
                    className="text-base font-semibold text-foreground hover:text-primary transition-colors flex items-center space-x-2 font-serif"
                  >
                    <span>{p.name}</span>
                  </Link>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {p.description || "Clean-room architectural analysis target"}
                  </p>
                  <div className="text-sm text-muted-foreground font-mono">
                    ID: {p.id}
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <Badge variant="outline" className="text-sm font-mono capitalize">
                    {p.status.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                  <Button asChild variant="outline" size="sm" className="text-sm font-semibold">
                    <Link href={`/projects/${p.id}`}>
                      <span>Open</span>
                      <ArrowRight className="ms-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
