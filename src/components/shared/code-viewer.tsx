"use client";

import React, { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CodeViewerProps {
  filename?: string;
  code: string;
  language?: string;
  maxHeight?: string;
}

export function CodeViewer({
  filename,
  code,
  language = "typescript",
  maxHeight = "400px",
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const lines = code.trim().split("\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-border bg-muted/20 overflow-hidden font-mono text-sm">
      {/* Code Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/40">
        <div className="flex items-center space-x-2  text-muted-foreground">
          <Terminal className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-foreground">{filename || `snippet.${language}`}</span>
          <span className="text-sm uppercase text-muted-foreground/80">({language})</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 text-sm text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="me-1 h-3.5 w-3.5 text-success" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="me-1 h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </Button>
      </div>

      {/* Code Content Island (Strict LTR) */}
      <div
        dir="ltr"
        tabIndex={0}
        role="region"
        aria-label="Source code, scrollable"
        className="p-4 overflow-x-auto text-start code-island select-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        style={{ maxHeight }}
      >
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className="hover:bg-muted/30">
                <td className="w-10 pe-4 text-end select-none text-muted-foreground/50 text-sm font-mono">
                  {index + 1}
                </td>
                <td className="font-mono text-foreground/90 whitespace-pre leading-relaxed">
                  {line || " "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
