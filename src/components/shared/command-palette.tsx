"use client";

import React, { useEffect, useState } from "react";
import { Search, Plus, FileText, Shield, CreditCard, FolderKanban, X } from "lucide-react";
import { useRouter } from "next/navigation";

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const commands = [
    { label: "New Project Analysis", icon: Plus, action: () => router.push("/projects/new") },
    { label: "View All Projects", icon: FolderKanban, action: () => router.push("/projects") },
    { label: "Search Projects", icon: Search, action: () => router.push("/projects") },
    { label: "Billing & platform credits", icon: CreditCard, action: () => router.push("/billing") },
    { label: "Security Architecture", icon: Shield, action: () => router.push("/security") },
    { label: "Documentation", icon: FileText, action: () => router.push("/docs") },
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 flex items-start justify-center pt-24 p-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card shadow-lg overflow-hidden font-sans">
        <div className="flex items-center px-4 py-3 border-b border-border bg-muted/20">
          <Search className="h-4 w-4 text-muted-foreground me-2" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, navigation or commands... (Esc to exit)"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No matching commands or projects found.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <button
                key={idx}
                onClick={() => {
                  cmd.action();
                  setIsOpen(false);
                }}
                className="w-full flex items-center px-3 py-2 text-sm rounded-md text-foreground hover:bg-muted transition text-start"
              >
                <cmd.icon className="me-2.5 h-4 w-4 text-primary" />
                <span>{cmd.label}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
