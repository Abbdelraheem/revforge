"use client";

import React, { useEffect, useState } from "react";
import { Search, Globe, Moon, Sun, Plus, FileText, Shield, CreditCard, LayoutDashboard, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/components/ui/button";

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
    { label: "New Target Analysis", icon: Plus, action: () => router.push("/#new-analysis") },
    { label: "Dashboard Overview", icon: LayoutDashboard, action: () => router.push("/") },
    { label: "Design System Tokens", icon: FileText, action: () => router.push("/design-system") },
    { label: "Security Architecture", icon: Shield, action: () => router.push("/docs#security") },
    { label: "Billing & Invoices", icon: CreditCard, action: () => router.push("/#pricing") },
    {
      label: "Toggle Language (Arabic / English)",
      icon: Globe,
      action: () => {
        const html = document.documentElement;
        const currentLang = html.getAttribute("lang");
        if (currentLang === "ar") {
          html.setAttribute("lang", "en");
          html.setAttribute("dir", "ltr");
        } else {
          html.setAttribute("lang", "ar");
          html.setAttribute("dir", "rtl");
        }
      },
    },
    {
      label: "Toggle Theme (Light / Dark)",
      icon: Sun,
      action: () => {
        document.documentElement.classList.toggle("dark");
      },
    },
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-24 p-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card shadow-2xl overflow-hidden font-sans">
        <div className="flex items-center px-4 py-3 border-b border-border bg-muted/20">
          <Search className="h-4 w-4 text-muted-foreground me-2" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands or jump to section... (Esc to exit)"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No matching commands found.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <button
                key={idx}
                onClick={() => {
                  cmd.action();
                  setIsOpen(false);
                }}
                className="w-full flex items-center px-3 py-2 text-xs rounded-md text-foreground hover:bg-muted transition text-start"
              >
                <cmd.icon className="me-2.5 h-4 w-4 text-primary" />
                <span>{cmd.label}</span>
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
          <span>Navigation Quick Jump</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
}
