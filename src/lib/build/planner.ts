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

export interface BuildPlanReportInput {
  boundaries?: { clientBoundaries: string[]; apiEndpoints: string[] };
  screens?: Array<{ id: string; route: string; purpose: string }>;
  flows?: Array<{ id: string; name: string; description: string }>;
  apiContracts?: Array<{ method: string; pathPattern: string }>;
}

/**
 * Transforms clean-room technical analysis report into an ordered DAG of obligations.
 * Turns every screen, flow, and API contract into a testable obligation.
 */
export function generateBuildPlan(
  projectId: string,
  report: BuildPlanReportInput
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

  // 2. Data boundaries & API contracts
  const apiContracts = report.apiContracts || [];
  if (apiContracts.length > 0) {
    for (const contract of apiContracts) {
      const safeKey = `api.${contract.method.toLowerCase()}.${contract.pathPattern.replace(/[^a-zA-Z0-9]/g, "_")}`;
      obligations.push({
        key: safeKey,
        category: "api",
        description: `Implement API contract [${contract.method.toUpperCase()}] ${contract.pathPattern}`,
        acceptanceSpec: {
          targetFiles: [`src/app/api/${contract.pathPattern.replace(/^\//, "").split("/")[0]}/route.ts`],
          contractEndpoints: [contract.pathPattern],
        },
        dependencies: ["scaffold.base"],
      });
    }
  } else if (report.boundaries?.apiEndpoints) {
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
  }

  // 3. UI screens & client boundaries
  const screens = report.screens || [];
  if (screens.length > 0) {
    for (const screen of screens) {
      const safeKey = `ui.screen.${screen.id.toLowerCase()}`;
      const routePath = screen.route === "/" ? "page" : screen.route.replace(/^\//, "");
      obligations.push({
        key: safeKey,
        category: "ui",
        description: `Implement screen ${screen.id}: ${screen.purpose} (${screen.route})`,
        acceptanceSpec: {
          targetFiles: [`src/app/${routePath}/page.tsx`],
        },
        dependencies: ["scaffold.base"],
      });
    }
  } else if (report.boundaries?.clientBoundaries) {
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
  }

  // 4. Interactive user flows
  const flows = report.flows || [];
  for (const flow of flows) {
    const safeKey = `flow.${flow.id.replace(/[^a-zA-Z0-9]/g, "_")}`;
    obligations.push({
      key: safeKey,
      category: "integration",
      description: `Implement and verify user flow: ${flow.name} (${flow.description})`,
      acceptanceSpec: {
        targetFiles: [],
      },
      dependencies: ["scaffold.base"],
    });
  }

  // 5. Verification and integration
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
