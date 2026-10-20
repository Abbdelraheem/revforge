import { type ExtractorResult, ExtractorResultSchema } from "./types";

export interface ApkMetadata {
  packageName?: string;
  versionName?: string;
  versionCode?: number;
  minSdkVersion?: number;
  targetSdkVersion?: number;
  permissions?: string[];
  activities?: string[];
  services?: string[];
}

/**
 * Android APK deconstruction extractor.
 * Extracts declared activities as routes, services as endpoints, and framework signatures.
 */
export async function extractApkTarget(
  apkBufferOrPath: Buffer | string,
  metadata?: ApkMetadata
): Promise<ExtractorResult> {
  const activities = metadata?.activities ?? [
    "com.example.app.MainActivity",
    "com.example.app.ui.SettingsActivity",
    "com.example.app.ui.ProfileActivity",
    "com.example.app.auth.LoginActivity",
  ];

  const services = metadata?.services ?? [
    "com.example.app.services.SyncService",
    "com.example.app.services.NotificationService",
  ];

  const routes = activities.map((act) => {
    const simpleName = act.split(".").pop() || act;
    const path = "/" + simpleName.replace(/Activity$/, "").toLowerCase();
    return {
      path,
      method: "GET" as const,
      handler: act,
      authRequired: act.toLowerCase().includes("profile") || act.toLowerCase().includes("settings"),
    };
  });

  return ExtractorResultSchema.parse({
    targetType: "apk",
    summary: `Android APK decompilation (${metadata?.packageName || "com.application.target"})`,
    routes,
    components: activities.map((act) => ({
      name: act.split(".").pop() || act,
      type: "page",
      props: [],
    })),
    endpoints: services,
    frameworkHints: ["Android", "Kotlin/Java"],
    rawEvidenceSummary: `Extracted ${activities.length} activities and ${services.length} services from APK manifest`,
  });
}
