import { z } from "zod";

export const TechnologyItemSchema = z.object({
  name: z.string(),
  confidence: z.number().min(0).max(1),
  sourceRef: z.string().optional(),
});

export const DetectedStackSchema = z.object({
  frontend: z.array(TechnologyItemSchema).optional(),
  backend: z.array(TechnologyItemSchema).optional(),
  database: z.array(TechnologyItemSchema).optional(),
  runtime: z.string().optional(),
});

export const ArchitectureBoundariesSchema = z.object({
  clientBoundaries: z.array(z.string()),
  apiEndpoints: z.array(z.string()),
  storageInterfaces: z.array(z.string()),
  securityPerimeters: z.array(z.string()),
});

export const EvidenceItemOutputSchema = z.object({
  component: z.string(),
  category: z.string(),
  status: z.enum(["seen", "inferred", "unknown_server_side"]),
  confidence: z.number().min(0).max(1),
  sourceRef: z.string().optional(),
  detail: z.string(),
});

export const DiscoveredFeatureSchema = z.object({
  name: z.string(),
  class: z.string(),
  tier: z.enum(["portfolio", "web_app", "mobile_app", "desktop_binary", "enterprise_saas"]),
  estimatedHours: z.number().min(0.25).max(200),
  rationale: z.string(),
  optional: z.boolean().default(false),
});

export const TechnicalReportOutputSchema = z.object({
  classification: z.enum(["portfolio", "web_app", "mobile_app", "desktop_binary", "enterprise_saas"]),
  classificationReasoning: z.string(),
  stack: DetectedStackSchema,
  boundaries: ArchitectureBoundariesSchema,
  summary: z.string(),
  evidenceLedger: z.array(EvidenceItemOutputSchema),
  features: z.array(DiscoveredFeatureSchema),
  risksAndLimitations: z.array(z.string()),
});

export type TechnicalReportOutput = z.infer<typeof TechnicalReportOutputSchema>;
