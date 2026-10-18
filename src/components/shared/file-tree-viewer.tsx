"use client";

import React, { useState } from "react";
import { Folder, FolderOpen, FileCode, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/components/ui/button";

export interface TreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: TreeNode[];
  sizeBytes?: number;
}

export interface FileTreeViewerProps {
  tree: TreeNode[];
  selectedPath?: string;
  onSelectFile?: (node: TreeNode) => void;
}

function TreeItem({
  node,
  depth,
  selectedPath,
  onSelectFile,
}: {
  node: TreeNode;
  depth: number;
  selectedPath?: string;
  onSelectFile?: (node: TreeNode) => void;
}) {
  const [isOpen, setIsOpen] = useState(depth === 0);
  const isSelected = selectedPath === node.path;

  if (node.type === "directory") {
    return (
      <div className="select-none">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex w-full items-center py-1 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded transition",
            depth > 0 && "ps-[calc(var(--depth)*14px)]"
          )}
          style={{ "--depth": depth } as React.CSSProperties}
        >
          {isOpen ? (
            <ChevronDown className="me-1 h-3.5 w-3.5 text-muted-foreground/60 flex-shrink-0" />
          ) : (
            <ChevronRight className="me-1 h-3.5 w-3.5 text-muted-foreground/60 flex-shrink-0" />
          )}
          {isOpen ? (
            <FolderOpen className="me-1.5 h-3.5 w-3.5 text-primary flex-shrink-0" />
          ) : (
            <Folder className="me-1.5 h-3.5 w-3.5 text-primary/80 flex-shrink-0" />
          )}
          <span className="font-mono truncate">{node.name}</span>
        </button>

        {isOpen && node.children && (
          <div className="space-y-0.5">
            {node.children.map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelectFile={onSelectFile}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelectFile?.(node)}
      className={cn(
        "flex w-full items-center py-1 px-2 text-xs rounded transition text-start",
        isSelected
          ? "bg-primary/10 text-primary font-medium"
          : "text-foreground/80 hover:text-foreground hover:bg-muted/30",
        depth > 0 && "ps-[calc(var(--depth)*14px+16px)]"
      )}
      style={{ "--depth": depth } as React.CSSProperties}
    >
      <FileCode className="me-1.5 h-3.5 w-3.5 text-muted-foreground/60 flex-shrink-0" />
      <span className="font-mono truncate">{node.name}</span>
      {node.sizeBytes && (
        <span className="ms-auto font-mono text-[10px] text-muted-foreground/50 tabular-nums">
          {(node.sizeBytes / 1024).toFixed(1)}k
        </span>
      )}
    </button>
  );
}

export function FileTreeViewer({
  tree,
  selectedPath,
  onSelectFile,
}: FileTreeViewerProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-2 text-xs font-mono space-y-0.5 max-h-[400px] overflow-y-auto">
      {tree.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          depth={0}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
        />
      ))}
    </div>
  );
}
