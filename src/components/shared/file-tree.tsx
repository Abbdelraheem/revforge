import React from "react";
import { Folder, FileCode, FileText } from "lucide-react";

export interface FileNode {
  name: string;
  type: "file" | "directory";
  children?: FileNode[];
}

export function FileTree({ nodes }: { nodes: FileNode[] }) {
  return (
    <div className="font-mono text-sm space-y-1">
      {nodes.map((node, i) => (
        <FileTreeNode key={i} node={node} level={0} />
      ))}
    </div>
  );
}

function FileTreeNode({ node, level }: { node: FileNode; level: number }) {
  const [open, setOpen] = React.useState(true);

  if (node.type === "directory") {
    return (
      <div style={{ paddingLeft: `${level * 16}px` }}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center space-x-1.5 py-1 text-foreground hover:text-primary transition"
        >
          <Folder className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">{node.name}</span>
        </button>
        {open && node.children && (
          <div>
            {node.children.map((child, i) => (
              <FileTreeNode key={i} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isCode = /\.(ts|tsx|js|jsx|json)$/.test(node.name);

  return (
    <div
      style={{ paddingLeft: `${level * 16}px` }}
      className="flex items-center space-x-1.5 py-1 text-muted-foreground hover:text-foreground"
    >
      {isCode ? <FileCode className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
      <span>{node.name}</span>
    </div>
  );
}
