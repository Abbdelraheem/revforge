import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RevForge — Software Architecture Reconstruction & Clean-Room Code Generation",
  description:
    "Autonomous Clean-Room Reverse Engineering, Technical Scoping, Dynamic Cost Estimation, and Production Code Generation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      dir="ltr"
      className="light"
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-primary/20 selection:text-primary">
        {children}
      </body>
    </html>
  );
}
