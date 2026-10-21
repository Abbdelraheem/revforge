import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const session = await getSession();
  if (!session || session.user.platformRole !== "superadmin") {
    redirect("/login");
  }

  const allOrders = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(50);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <div className="space-y-2 border-b border-border pb-4">
        <Badge variant="outline" className="border-primary/40 text-primary text-sm">
          FINANCIAL OPERATIONS
        </Badge>
        <h1 className="text-3xl font-serif font-bold text-foreground">
          Platform Orders & Revenue
        </h1>
        <p className="text-sm text-muted-foreground">
          All client payment transactions, Paddle settlement states, and credit redemptions.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="p-3 text-start font-semibold">Order ID</th>
                  <th className="p-3 text-start font-semibold">Workspace</th>
                  <th className="p-3 text-start font-semibold">Kind</th>
                  <th className="p-3 text-start font-semibold">Amount</th>
                  <th className="p-3 text-start font-semibold">Status</th>
                  <th className="p-3 text-start font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {allOrders.map((o) => (
                  <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                    <td className="p-3 font-mono text-sm">{o.id.slice(0, 8)}...</td>
                    <td className="p-3 font-mono text-sm text-muted-foreground">{o.workspaceId.slice(0, 8)}...</td>
                    <td className="p-3 capitalize">{o.kind}</td>
                    <td className="p-3 font-mono font-bold">${(o.amountCents / 100).toFixed(2)}</td>
                    <td className="p-3">
                      <Badge variant={o.status === "paid" || o.status === "paid_by_credit" ? "default" : "secondary"}>
                        {o.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(o.createdAt).toLocaleDateString()}
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
