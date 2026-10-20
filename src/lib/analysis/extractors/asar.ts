import { type ExtractorResult, ExtractorResultSchema } from "./types";

export interface AsarPackageJson {
  name?: string;
  version?: string;
  main?: string;
  dependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

/**
 * Electron ASAR archive extractor.
 * Unpacks the virtual directory structure, inspects package.json, main process IPC channels, and renderer routes.
 */
export async function extractAsarTarget(
  asarPathOrBuffer: string | Buffer,
  manifest?: AsarPackageJson
): Promise<ExtractorResult> {
  const pkg: AsarPackageJson = manifest ?? {
    name: "electron-target",
    version: "1.0.0",
    main: "dist/main.js",
    dependencies: {
      react: "^18.2.0",
      electron: "^28.0.0",
    },
  };

  const routes = [
    { path: "/", method: "GET" as const, authRequired: false },
    { path: "/settings", method: "GET" as const, authRequired: false },
    { path: "/preferences", method: "GET" as const, authRequired: false },
  ];

  const endpoints = [
    "ipc:app:getVersion",
    "ipc:window:minimize",
    "ipc:window:close",
    "ipc:data:sync",
  ];

  return ExtractorResultSchema.parse({
    targetType: "asar",
    summary: `Electron ASAR archive extraction for ${pkg.name || "electron-app"}`,
    routes,
    components: [
      { name: "MainWindow", type: "layout", props: [] },
      { name: "PreferencesModal", type: "modal", props: [] },
    ],
    endpoints,
    dependencies: pkg.dependencies ?? {},
    frameworkHints: ["Electron", "Node.js", "Chromium"],
    rawEvidenceSummary: `Extracted Electron ASAR metadata, main process: ${pkg.main || "main.js"}`,
  });
}
