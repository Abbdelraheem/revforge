export interface StackDefinition {
  id: string;
  name: string;
  description: string;
  framework: "nextjs" | "vite" | "express" | "generic";
  templateFiles: Record<string, string>;
}

export const STACKS: Record<string, StackDefinition> = {
  "nextjs-fullstack": {
    id: "nextjs-fullstack",
    name: "Next.js App Router (TypeScript)",
    description: "Modern production-grade React with server components and API routes",
    framework: "nextjs",
    templateFiles: {
      "package.json": JSON.stringify(
        {
          name: "reconstructed-app",
          version: "0.1.0",
          private: true,
          scripts: {
            dev: "next dev",
            build: "next build",
            start: "next start",
            lint: "next lint",
          },
          dependencies: {
            next: "^15.1.0",
            react: "^19.0.0",
            "react-dom": "^19.0.0",
          },
          devDependencies: {
            typescript: "^5.7.0",
            "@types/node": "^22.0.0",
            "@types/react": "^19.0.0",
            "@types/react-dom": "^19.0.0",
            tailwindcss: "^3.4.0",
          },
        },
        null,
        2
      ),
      "tsconfig.json": JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            lib: ["dom", "dom.iterable", "esnext"],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            module: "esnext",
            moduleResolution: "bundler",
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: "preserve",
            incremental: true,
            plugins: [{ name: "next" }],
            paths: { "@/*": ["./src/*"] },
          },
          include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
          exclude: ["node_modules"],
        },
        null,
        2
      ),
      "src/app/layout.tsx": `import React from "react";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`,
      "src/app/page.tsx": `import React from "react";
export default function HomePage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Application Reconstructed</h1>
      <p>Clean-room specification build complete.</p>
    </main>
  );
}`,
    },
  },
};
