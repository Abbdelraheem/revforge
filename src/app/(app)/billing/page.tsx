import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { withTenant } from "@/db/tenant";
import { orders, creditsLedger } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, History, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  let workspaceOrders: any[] = [];
  let transactions: any[] = [];
  let balanceCents = 0;

  try {
    const res = await withTenant(
      { userId: session.user.id, workspaceId: session.workspace.id },
      async (tx) => {
        const ords = await tx
          .select()
          .from(orders)
          .where(eq(orders.workspaceId, session.workspace.id))
          .orderBy(desc(orders.createdAt))
          .limit(20);

        const txns = await tx
          .select()
          .from(creditsLedger)
          .where(eq(creditsLedger.workspaceId, session.workspace.id))
          .orderBy(desc(creditsLedger.createdAt))
          .limit(20);

        const [balanceRow] = await tx
          .select({
            total: sql<number>`coalesce(sum(${creditsLedger.deltaCents}), 0)::int`,
          })
          .from(creditsLedger)
          .where(eq(creditsLedger.workspaceId, session.workspace.id));

        return {
          workspaceOrders: ords,
          transactions: txns,
          balanceCents: Math.max(0, Number(balanceRow?.total ?? 0)),
        };
      }
    );
    workspaceOrders = res.workspaceOrders;
    transactions = res.transactions;
    balanceCents = res.balanceCents;
  } catch (err: any) {
    if (process.env.NODE_ENV !== "development") {
      throw err;
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 font-sans">
      <div className="space-y-2 border-b border-border pb-4">
        <p className="text-sm font-semibold tracking-wider text-primary uppercase">WORKSPACE BILLING & CREDITS
        </p>
        <h1 className="text-3xl font-serif font-bold text-foreground">
          Platform Billing & Credits
        </h1>
        <p className="text-sm text-muted-foreground">
          View your platform credit balance, past build orders, and append-only ledger transactions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Available Credits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold font-mono text-primary">
              ${(balanceCents / 100).toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">
              Automatically applied to next build orders
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Payment Provider</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-xl font-bold text-foreground flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <span>Paddle Billing</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Merchant of Record (USD Only)
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Free Tier Entitlement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-xl font-bold text-foreground flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span>
                {Math.max(0, 1 - (session.user.analysisCreditsUsed || 0))} Free Analysis
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Additional analyses use the analysis fee recorded at checkout.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-foreground">Build Orders</h2>
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-0">
            {workspaceOrders.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No orders processed yet.
              </div>
            ) : (
              <>
                <ul className="divide-y divide-border md:hidden">
                  {workspaceOrders.map((ord) => (
                    <li key={ord.id} className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-mono text-sm text-muted-foreground">
                            {ord.id.slice(0, 8)}...
                          </p>
                          <p className="font-semibold capitalize text-foreground">{ord.kind}</p>
                        </div>
                        <p className="font-mono font-bold">${(ord.amountCents / 100).toFixed(2)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={ord.status === "paid" || ord.status === "paid_by_credit" ? "default" : "secondary"}>
                          {ord.status}
                        </Badge>
                        <span className="font-mono text-sm text-muted-foreground">
                          {new Date(ord.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 border-b border-border">
                      <tr>
                        <th className="p-3 text-start font-semibold">Order ID</th>
                        <th className="p-3 text-start font-semibold">Kind</th>
                        <th className="p-3 text-start font-semibold">Amount</th>
                        <th className="p-3 text-start font-semibold">Status</th>
                        <th className="p-3 text-start font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workspaceOrders.map((ord) => (
                        <tr key={ord.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                          <td className="p-3 font-mono text-sm">{ord.id.slice(0, 8)}...</td>
                          <td className="p-3 capitalize">{ord.kind}</td>
                          <td className="p-3 font-mono font-bold">${(ord.amountCents / 100).toFixed(2)}</td>
                          <td className="p-3">
                            <Badge variant={ord.status === "paid" || ord.status === "paid_by_credit" ? "default" : "secondary"}>
                              {ord.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {new Date(ord.createdAt).toLocaleDateString()}
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

      {/* Credits Ledger Transactions */}
      <div className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-foreground">Platform Credits Ledger</h2>
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-0">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No credit transactions recorded.
              </div>
            ) : (
              <>
                <ul className="divide-y divide-border md:hidden">
                  {transactions.map((tx) => (
                    <li key={tx.id} className="space-y-1 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-mono text-sm text-muted-foreground">
                          {tx.id.slice(0, 8)}...
                        </p>
                        <p className="font-mono font-bold">
                          {tx.deltaCents >= 0 ? "+" : ""}${(tx.deltaCents / 100).toFixed(2)}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">{tx.reason}</p>
                      <p className="font-mono text-sm text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 border-b border-border">
                      <tr>
                        <th className="p-3 text-start font-semibold">Transaction ID</th>
                        <th className="p-3 text-start font-semibold">Adjustment</th>
                        <th className="p-3 text-start font-semibold">Reason</th>
                        <th className="p-3 text-start font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                          <td className="p-3 font-mono text-sm">{tx.id.slice(0, 8)}...</td>
                          <td className="p-3 font-mono font-bold">
                            {tx.deltaCents >= 0 ? "+" : ""}${(tx.deltaCents / 100).toFixed(2)}
                          </td>
                          <td className="p-3 text-muted-foreground">{tx.reason}</td>
                          <td className="p-3 text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleDateString()}
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
    </div>
  );
}
