import { TechnicalReportOutput } from "@/lib/analysis/types";

export interface BuildObligation {
  key: string;
  category: "scaffold" | "database" | "api" | "ui" | "integration";
  description: string;
  acceptanceSpec: {
    targetFiles: string[];
    requiredSymbols?: string[];
    contractEndpoints?: string[];
  };
  dependencies: string[];
}

export interface BuildPlan {
  projectId: string;
  stackId: string;
  obligations: BuildObligation[];
}

/**
 * Transforms clean-room technical analysis report into an ordered DAG of obligations.
 */
export function generateBuildPlan(
  projectId: string,
  report: { boundaries: { clientBoundaries: string[]; apiEndpoints: string[] } }
): BuildPlan {
  const obligations: BuildObligation[] = [];

  // 1. Foundation scaffold
  obligations.push({
    key: "scaffold.base",
    category: "scaffold",
    description: "Initialize application repository, tooling, TypeScript configuration, and base layout.",
    acceptanceSpec: {
      targetFiles: ["package.json", "tsconfig.json", "src/app/layout.tsx"],
    },
    dependencies: [],
  });

  // 2. Data boundaries & API routes
  for (const endpoint of report.boundaries.apiEndpoints) {
    const safeKey = `api.${endpoint.replace(/[^a-zA-Z0-9]/g, "_")}`;
    obligations.push({
      key: safeKey,
      category: "api",
      description: `Implement API route contract for ${endpoint}`,
      acceptanceSpec: {
        targetFiles: [`src/app/api/${endpoint.replace(/^\//, "").split("/")[0]}/route.ts`],
        contractEndpoints: [endpoint],
      },
      dependencies: ["scaffold.base"],
    });
  }

  // 3. UI client boundaries / pages
  for (const boundary of report.boundaries.clientBoundaries) {
    const safeKey = `ui.${boundary.replace(/[^a-zA-Z0-9]/g, "_")}`;
    obligations.push({
      key: safeKey,
      category: "ui",
      description: `Implement client route boundary for ${boundary}`,
      acceptanceSpec: {
        targetFiles: [`src/app/${boundary.replace(/^\//, "")}/page.tsx`],
      },
      dependencies: ["scaffold.base"],
    });
  }

  // 4. Verification and integration
  obligations.push({
    key: "integration.verify",
    category: "integration",
    description: "End-to-end build verification, lint validation, and parity check.",
    acceptanceSpec: {
      targetFiles: [],
    },
    dependencies: obligations.map((o) => o.key),
  });

  return {
    projectId,
    stackId: "nextjs-fullstack",
    obligations,
  };
}
