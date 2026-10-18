"use client";

import React from "react";
import { cn } from "@/components/ui/button";

export interface DiffLine {
  type: "add" | "delete" | "normal";
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffViewerProps {
  filename: string;
  diffLines: DiffLine[];
  maxHeight?: string;
}

export function DiffViewer({
  filename,
  diffLines,
  maxHeight = "360px",
}: DiffViewerProps) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden text-xs font-mono">
      <div className="px-4 py-2 border-b border-border bg-muted/40 flex items-center justify-between text-muted-foreground">
        <span className="font-semibold text-foreground">{filename}</span>
        <span className="text-[10px] text-muted-foreground/70">Clean-Room Diff</span>
      </div>

      <div
        dir="ltr"
        className="p-2 overflow-x-auto code-island select-text"
        style={{ maxHeight }}
      >
        <table className="w-full border-collapse">
          <tbody>
            {diffLines.map((line, idx) => {
              const rowStyle =
                line.type === "add"
                  ? "bg-success/10 text-success"
                  : line.type === "delete"
                  ? "bg-destructive/10 text-destructive"
                  : "text-foreground/80 hover:bg-muted/20";

              const prefix = line.type === "add" ? "+" : line.type === "delete" ? "-" : " ";

              return (
                <tr key={idx} className={cn("transition-colors", rowStyle)}>
                  <td className="w-8 pe-2 text-end select-none text-muted-foreground/40 text-[10px]">
                    {line.oldLineNumber || " "}
                  </td>
                  <td className="w-8 pe-3 text-end select-none text-muted-foreground/40 text-[10px]">
                    {line.newLineNumber || " "}
                  </td>
                  <td className="w-4 select-none font-bold text-center">
                    {prefix}
                  </td>
                  <td className="whitespace-pre font-mono ps-1">{line.content}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
