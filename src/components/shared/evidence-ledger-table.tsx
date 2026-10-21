import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export interface EvidenceRow {
  component: string;
  category: string;
  status: string;
  confidence: number;
  detail?: string | null;
}

export function EvidenceLedgerTable({ items }: { items: EvidenceRow[] }) {
  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Component</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Evidence Detail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                No evidence items recorded.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-semibold text-foreground">{item.component}</TableCell>
                <TableCell className="capitalize text-muted-foreground">{item.category}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      item.status === "verified_public"
                        ? "default"
                        : item.status === "inferred_wire"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono">
                  {(item.confidence * 100).toFixed(0)}%
                </TableCell>
                <TableCell className="text-muted-foreground max-w-xs truncate">
                  {item.detail || "Empirical observation"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
