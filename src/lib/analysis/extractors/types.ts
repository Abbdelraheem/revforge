import { z } from "zod";

export const ExtractedRouteSchema = z.object({
  path: z.string(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]).default("GET"),
  handler: z.string().optional(),
  authRequired: z.boolean().default(false),
});

export const ExtractedComponentSchema = z.object({
  name: z.string(),
  type: z.enum(["page", "component", "layout", "modal", "form"]),
  filePath: z.string().optional(),
  props: z.array(z.string()).default([]),
});

export const ExtractorResultSchema = z.object({
  targetType: z.enum(["web", "har", "apk", "asar", "binary", "repo"]),
  summary: z.string(),
  routes: z.array(ExtractedRouteSchema).default([]),
  components: z.array(ExtractedComponentSchema).default([]),
  endpoints: z.array(z.string()).default([]),
  dependencies: z.record(z.string()).default({}),
  frameworkHints: z.array(z.string()).default([]),
  rawEvidenceSummary: z.string().default(""),
});

export type ExtractorResult = z.infer<typeof ExtractorResultSchema>;
export type ExtractedRoute = z.infer<typeof ExtractedRouteSchema>;
export type ExtractedComponent = z.infer<typeof ExtractedComponentSchema>;
