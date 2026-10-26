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

export const ScreenElementSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  label: z.string(),
  location: z.string(),
  relativeSize: z.string().optional(),
  states: z
    .object({
      normal: z.string().optional(),
      hover: z.string().optional(),
      focus: z.string().optional(),
      disabled: z.string().optional(),
      error: z.string().optional(),
      loading: z.string().optional(),
    })
    .partial()
    .optional(),
  action: z.string().optional(),
});

export const ScreenSchema = z.object({
  id: z.string(), // S1, S2, S3...
  route: z.string(),
  purpose: z.string(),
  access: z.string().default("public"),
  navigation: z.string().default("direct"),
  elements: z.array(ScreenElementSchema).optional().default([]),
});

export const DesignTokensSchema = z.object({
  colors: z.record(z.string()).optional().default({}),
  fonts: z.record(z.string()).optional().default({}),
  typographyScale: z.record(z.string()).optional().default({}),
  spacingScale: z.record(z.string()).optional().default({}),
  borderRadius: z.record(z.string()).optional().default({}),
  shadows: z.record(z.string()).optional().default({}),
  breakpoints: z.record(z.string()).optional().default({}),
});

export const UserFlowStepSchema = z.object({
  step: z.number().optional(),
  trigger: z.string(),
  immediateVisual: z.string(),
  nextAction: z.string(),
  successResult: z.string(),
  failureResult: z.string(),
});

export const UserFlowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  steps: z.array(UserFlowStepSchema).default([]),
});

export const ApiContractSchema = z.object({
  method: z.string(),
  pathPattern: z.string(),
  requestPayload: z.record(z.string()).optional().default({}),
  responseShape: z.record(z.string()).optional().default({}),
  authMethod: z.string().optional().default("none"),
  errorResponses: z.record(z.string()).optional().default({}),
  inferredEntity: z.string().optional(),
});

export const ThirdPartyIntegrationSchema = z.object({
  service: z.string(),
  purpose: z.string(),
  rebuildStrategy: z.enum(["stub", "placeholder", "owner_supplied", "real_integration"]).default("stub"),
  details: z.string().optional(),
});

export const CannotBeCopiedItemSchema = z.object({
  category: z.string(),
  item: z.string(),
  rebuildAlternative: z.string(),
});

export const ComplexityCountsSchema = z.object({
  screensCount: z.number().default(0),
  componentsCount: z.number().default(0),
  formsCount: z.number().default(0),
  apiEndpointsCount: z.number().default(0),
  entitiesCount: z.number().default(0),
  integrationsCount: z.number().default(0),
  authRolesCount: z.number().default(0),
  realtimeFeaturesCount: z.number().default(0),
  estimatedHoursArithmetic: z.string().default(""),
  totalEstimatedHours: z.number().default(0),
});

export const TechnicalReportOutputSchema = z.object({
  classification: z.enum(["portfolio", "web_app", "mobile_app", "desktop_binary", "enterprise_saas"]),
  classificationReasoning: z.string(),
  stack: DetectedStackSchema,
  boundaries: ArchitectureBoundariesSchema,
  summary: z.string(),
  evidenceLedger: z.array(EvidenceItemOutputSchema),
  features: z.array(DiscoveredFeatureSchema),
  screens: z.array(ScreenSchema).optional().default([]),
  designTokens: DesignTokensSchema.optional().default({}),
  flows: z.array(UserFlowSchema).optional().default([]),
  apiContracts: z.array(ApiContractSchema).optional().default([]),
  thirdParties: z.array(ThirdPartyIntegrationSchema).optional().default([]),
  cannotBeCopied: z.array(CannotBeCopiedItemSchema).optional().default([]),
  complexity: ComplexityCountsSchema.optional(),
  openQuestions: z.array(z.string()).optional().default([]),
  risksAndLimitations: z.array(z.string()),
});

export type TechnicalReportOutput = z.infer<typeof TechnicalReportOutputSchema>;
