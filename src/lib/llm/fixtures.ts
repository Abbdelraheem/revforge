import { TechnicalReportOutput } from "../analysis/types";

export interface FixtureDataset {
  "demo-site": TechnicalReportOutput;
  "har": TechnicalReportOutput;
  "asar": TechnicalReportOutput;
}

export const DEMO_SITE_FIXTURE: TechnicalReportOutput = {
  classification: "web_app",
  classificationReasoning: "Modern Next.js web application with interactive client state, REST API routes, and user authentication perimeters.",
  stack: {
    frontend: [
      { name: "React 19", confidence: 0.98, sourceRef: "art-dom-01" },
      { name: "Tailwind CSS", confidence: 0.95, sourceRef: "art-css-01" },
      { name: "Next.js App Router", confidence: 0.96, sourceRef: "art-bundle-01" },
    ],
    backend: [
      { name: "Node.js TypeScript API Routes", confidence: 0.92, sourceRef: "art-har-01" },
    ],
    database: [
      { name: "PostgreSQL Database Engine", confidence: 0.88, sourceRef: "art-har-02" },
    ],
    runtime: "Node.js v20 LTS",
  },
  boundaries: {
    clientBoundaries: ["Next.js Client Components with React Context", "Tailwind HSL Design Tokens"],
    apiEndpoints: ["/api/auth/session", "/api/projects", "/api/quotes"],
    storageInterfaces: ["S3 Multipart Direct Uploads", "Postgres SQL Connection Pool"],
    securityPerimeters: ["Session Cookies with HttpOnly", "Nonce Content-Security-Policy"],
  },
  summary: "Enterprise web application featuring responsive customer dashboard, API communication, and zero-trust session management.",
  evidenceLedger: [
    {
      component: "Responsive Layout Shell",
      category: "frontend",
      status: "seen",
      confidence: 0.96,
      sourceRef: "art-dom-01",
      detail: "Clean layout tree with navigation bar and main content area.",
    },
    {
      component: "REST API Contract",
      category: "backend",
      status: "inferred",
      confidence: 0.91,
      sourceRef: "art-har-01",
      detail: "Observed JSON schema request and response signatures across 3 routes.",
    },
    {
      component: "User Authentication",
      category: "security",
      status: "seen",
      confidence: 0.95,
      sourceRef: "art-auth-01",
      detail: "Secure HTTP-only cookie authentication session.",
    },
  ],
  features: [
    {
      name: "Responsive Dashboard Layout",
      class: "static_scaffold",
      tier: "web_app",
      estimatedHours: 4,
      rationale: "Next.js App Router shell with responsive Tailwind CSS.",
      optional: false,
    },
    {
      name: "Authentication Session Flow",
      class: "auth",
      tier: "web_app",
      estimatedHours: 8,
      rationale: "Secure credentials authentication with token session guards.",
      optional: false,
    },
    {
      name: "Project Management CRUD API",
      class: "crud_resources",
      tier: "web_app",
      estimatedHours: 12,
      rationale: "Typed JSON API endpoints with Zod payload validation.",
      optional: false,
    },
  ],
  screens: [
    {
      id: "S1",
      route: "/dashboard",
      purpose: "Primary workspace dashboard displaying active projects.",
      access: "signed-in",
      navigation: "direct",
      elements: [
        {
          type: "table",
          label: "Project List Table",
          location: "main-content",
          states: { normal: "renders project rows", loading: "skeleton loader", error: "inline retry banner" },
        },
      ],
    },
  ],
  designTokens: {
    colors: { primary: "#2563eb", background: "#ffffff", foreground: "#0f172a" },
    fonts: { sans: "Inter, sans-serif" },
    typographyScale: { h1: "2rem", body: "1rem" },
    spacingScale: { sm: "0.5rem", md: "1rem", lg: "1.5rem" },
    borderRadius: { sm: "0.25rem", md: "0.5rem" },
    shadows: { sm: "0 1px 2px rgba(0,0,0,0.05)" },
    breakpoints: { sm: "640px", md: "768px", lg: "1024px" },
  },
  flows: [
    {
      id: "F1",
      name: "User Sign-In",
      description: "Sign-in authentication sequence with session token.",
      steps: [
        {
          step: 1,
          trigger: "User submits credentials form",
          immediateVisual: "Submit button enters disabled loading state",
          nextAction: "Post credentials to /api/auth/session",
          successResult: "Session cookie set, redirect to /dashboard",
          failureResult: "Error banner displaying invalid credentials warning",
        },
      ],
    },
  ],
  apiContracts: [
    {
      method: "GET",
      pathPattern: "/api/projects",
      requestPayload: {},
      responseShape: { projects: "array" },
      authMethod: "session_cookie",
      errorResponses: { "401": "Unauthorized" },
      inferredEntity: "Project",
    },
  ],
  thirdParties: [
    {
      service: "Resend",
      purpose: "Transactional email notifications",
      rebuildStrategy: "stub",
    },
  ],
  cannotBeCopied: [
    {
      category: "server_logic",
      item: "Proprietary backend transaction validation engine",
      rebuildAlternative: "Standard clean-room state machine with database transaction isolation",
    },
  ],
  complexity: {
    screensCount: 5,
    componentsCount: 14,
    formsCount: 3,
    apiEndpointsCount: 4,
    entitiesCount: 3,
    integrationsCount: 1,
    authRolesCount: 2,
    realtimeFeaturesCount: 0,
    estimatedHoursArithmetic: "5 screens * 3h + 3 CRUD entities * 6h + auth * 10h = 43h",
    totalEstimatedHours: 43,
  },
  openQuestions: ["Confirm production SMTP credentials for outgoing mail delivery."],
  risksAndLimitations: [
    "Proprietary backend database queries are reconstructed from contract specifications rather than decompiled code.",
  ],
};

export const HAR_FIXTURE: TechnicalReportOutput = {
  classification: "enterprise_saas",
  classificationReasoning: "Multi-endpoint microservice API backend with bearer token authentication and pagination headers.",
  stack: {
    backend: [{ name: "FastAPI / Node.js API Service", confidence: 0.95, sourceRef: "art-har-01" }],
    database: [{ name: "Relational SQL Store", confidence: 0.89 }],
    runtime: "Docker Containerized Linux",
  },
  boundaries: {
    clientBoundaries: ["Single Page Application Client"],
    apiEndpoints: ["/v1/analytics/stream", "/v1/organizations", "/v1/billing/usage"],
    storageInterfaces: ["Object Storage S3", "Redis Queue"],
    securityPerimeters: ["JWT Bearer Authentication", "IP Rate Limiting"],
  },
  summary: "SaaS API platform deduced from network traffic capture.",
  evidenceLedger: [
    {
      component: "HTTP API Contract",
      category: "backend",
      status: "seen",
      confidence: 0.98,
      sourceRef: "art-har-01",
      detail: "Extracted 14 endpoint request/response pairs from HAR log.",
    },
    {
      component: "Persistent Data Models",
      category: "database",
      status: "unknown_server_side",
      confidence: 0.82,
      detail: "Inferred relational tables for Organization and Billing entities.",
    },
  ],
  features: [
    {
      name: "Organization Multi-Tenancy",
      class: "auth",
      tier: "enterprise_saas",
      estimatedHours: 16,
      rationale: "Isolated tenant workspaces and role-based permissions.",
      optional: false,
    },
    {
      name: "Usage Metrics Streaming API",
      class: "realtime",
      tier: "enterprise_saas",
      estimatedHours: 14,
      rationale: "SSE / streaming metric endpoints for dashboard telemetry.",
      optional: false,
    },
  ],
  screens: [
    {
      id: "S1",
      route: "/org/settings",
      purpose: "Manage organization members and usage tiers.",
      access: "admin",
      navigation: "settings-menu",
      elements: [
        {
          type: "widget",
          label: "Usage Meter",
          location: "sidebar-summary",
          states: { normal: "green meter", loading: "pulse animation" },
        },
      ],
    },
  ],
  designTokens: {
    colors: { primary: "#4f46e5", background: "#f8fafc", foreground: "#0f172a" },
    fonts: { sans: "Inter, sans-serif" },
    typographyScale: { h1: "2.25rem", body: "0.875rem" },
    spacingScale: { sm: "0.5rem", md: "1rem", lg: "1.5rem" },
    borderRadius: { sm: "0.5rem", md: "0.75rem" },
    shadows: { md: "0 4px 6px -1px rgba(0,0,0,0.1)" },
    breakpoints: { md: "768px", lg: "1024px", xl: "1440px" },
  },
  flows: [
    {
      id: "F1",
      name: "Invite Member",
      description: "Organization team member invite flow.",
      steps: [
        {
          step: 1,
          trigger: "Admin submits member email invite",
          immediateVisual: "Modal shows pending invite",
          nextAction: "Post invitation to /v1/organizations/invite",
          successResult: "Invitation record created, verification email queued",
          failureResult: "Error dialog showing duplicate or invalid address",
        },
      ],
    },
  ],
  apiContracts: [
    {
      method: "POST",
      pathPattern: "/v1/organizations/invite",
      requestPayload: { email: "string", role: "string" },
      responseShape: { inviteId: "string", status: "pending" },
      authMethod: "bearer_token",
      errorResponses: { "400": "Bad Request", "403": "Forbidden" },
      inferredEntity: "OrganizationInvite",
    },
  ],
  thirdParties: [
    {
      service: "Stripe",
      purpose: "Subscription billing & invoices",
      rebuildStrategy: "stub",
    },
  ],
  cannotBeCopied: [
    {
      category: "server_logic",
      item: "Realtime streaming aggregation engine",
      rebuildAlternative: "Polling fallback with in-memory buffer",
    },
  ],
  complexity: {
    screensCount: 8,
    componentsCount: 22,
    formsCount: 5,
    apiEndpointsCount: 14,
    entitiesCount: 6,
    integrationsCount: 2,
    authRolesCount: 3,
    realtimeFeaturesCount: 1,
    estimatedHoursArithmetic: "8 screens * 4h + 6 entities * 8h + realtime * 14h = 94h",
    totalEstimatedHours: 94,
  },
  openQuestions: ["Verify external webhook event schemas for payment providers."],
  risksAndLimitations: ["Server-side business logic inferred strictly from input/output telemetry."],
};

export const ASAR_FIXTURE: TechnicalReportOutput = {
  classification: "desktop_binary",
  classificationReasoning: "Cross-platform Electron desktop application with main process IPC bridge and renderer window.",
  stack: {
    frontend: [{ name: "Chromium Electron Renderer", confidence: 0.97, sourceRef: "art-asar-01" }],
    backend: [{ name: "Node.js Main Process IPC", confidence: 0.95, sourceRef: "art-asar-02" }],
    runtime: "Electron v28 / Node.js 20",
  },
  boundaries: {
    clientBoundaries: ["Preload Context Bridge", "HTML5 Desktop Canvas"],
    apiEndpoints: ["electron-ipc://file-system", "electron-ipc://native-window"],
    storageInterfaces: ["Local SQLite Database", "AppConfig JSON"],
    securityPerimeters: ["Context Isolation Enabled", "Node Integration Disabled"],
  },
  summary: "Electron desktop bundle extracted cleanly from unpacked ASAR archive.",
  evidenceLedger: [
    {
      component: "Renderer UI Bundle",
      category: "frontend",
      status: "seen",
      confidence: 0.95,
      sourceRef: "art-asar-01",
      detail: "Unpacked main HTML and renderer scripts.",
    },
    {
      component: "IPC Bridge Channels",
      category: "backend",
      status: "seen",
      confidence: 0.96,
      sourceRef: "art-asar-02",
      detail: "Observed IPC events in main.js preload interface.",
    },
  ],
  features: [
    {
      name: "Native Window Lifecycle & IPC",
      class: "admin_console",
      tier: "desktop_binary",
      estimatedHours: 14,
      rationale: "Electron main process with context-isolated IPC channels.",
      optional: false,
    },
    {
      name: "Local State SQLite Store",
      class: "database_modeling",
      tier: "desktop_binary",
      estimatedHours: 10,
      rationale: "Embedded database for offline desktop persistence.",
      optional: false,
    },
  ],
  screens: [
    {
      id: "S1",
      route: "desktop://window/main",
      purpose: "Primary desktop editor canvas and tool palette.",
      access: "public",
      navigation: "app-launch",
      elements: [
        {
          type: "toolbar",
          label: "Tool Palette",
          location: "top-toolbar",
          states: { normal: "selection tool active" },
        },
      ],
    },
  ],
  designTokens: {
    colors: { primary: "#0284c7", background: "#18181b", foreground: "#f4f4f5" },
    fonts: { sans: "system-ui, -apple-system, sans-serif" },
    typographyScale: { h1: "1.75rem", body: "0.875rem" },
    spacingScale: { sm: "0.25rem", md: "0.5rem", lg: "1rem" },
    borderRadius: { sm: "0.25rem", md: "0.375rem" },
    shadows: { sm: "0 1px 3px rgba(0,0,0,0.12)" },
    breakpoints: { md: "1024px", lg: "1440px" },
  },
  flows: [
    {
      id: "F1",
      name: "Save Workspace File",
      description: "File write flow using native file system IPC.",
      steps: [
        {
          step: 1,
          trigger: "User triggers Cmd/Ctrl+S",
          immediateVisual: "Status bar displays 'Saving...'",
          nextAction: "Invoke file-system:save via IPC context bridge",
          successResult: "File written to disk via IPC, status displays 'Saved'",
          failureResult: "Native error dialog indicating write permission failure",
        },
      ],
    },
  ],
  apiContracts: [
    {
      method: "POST",
      pathPattern: "electron-ipc://file-system/save",
      requestPayload: { filePath: "string", data: "string" },
      responseShape: { success: "boolean" },
      authMethod: "none",
      errorResponses: { "500": "EACCES Permission Denied" },
      inferredEntity: "LocalFile",
    },
  ],
  thirdParties: [],
  cannotBeCopied: [
    {
      category: "native_binary",
      item: "Closed-source native C++ image filtering addon",
      rebuildAlternative: "Standard WebAssembly or pure TypeScript image processing alternative",
    },
  ],
  complexity: {
    screensCount: 3,
    componentsCount: 16,
    formsCount: 2,
    apiEndpointsCount: 6,
    entitiesCount: 2,
    integrationsCount: 0,
    authRolesCount: 1,
    realtimeFeaturesCount: 0,
    estimatedHoursArithmetic: "3 screens * 4h + 2 entities * 6h + native window * 14h = 38h",
    totalEstimatedHours: 38,
  },
  openQuestions: ["Confirm target operating systems for native packaging: macOS / Windows / Linux."],
  risksAndLimitations: ["Native C++ addons require clean-room TypeScript re-implementation."],
};
