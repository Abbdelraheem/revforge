"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LangThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [isArabic, setIsArabic] = useState(true);

  useEffect(() => {
    setMounted(true);
    const html = document.documentElement;
    setIsDark(html.classList.contains("dark"));
    setIsArabic(html.getAttribute("lang") === "ar");
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.remove("dark");
      setIsDark(false);
    } else {
      html.classList.add("dark");
      setIsDark(true);
    }
  };

  const toggleLang = () => {
    const html = document.documentElement;
    if (isArabic) {
      html.setAttribute("lang", "en");
      html.setAttribute("dir", "ltr");
      setIsArabic(false);
    } else {
      html.setAttribute("lang", "ar");
      html.setAttribute("dir", "rtl");
      setIsArabic(true);
    }
  };

  if (!mounted) {
    return <div className="h-8 w-20" />;
  }

  return (
    <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleLang}
        className="h-8 px-2.5 text-xs font-mono text-muted-foreground hover:text-foreground"
      >
        <Globe className="me-1 h-3.5 w-3.5" />
        <span>{isArabic ? "EN" : "عربي"}</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        aria-label="Toggle theme"
      >
        {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
