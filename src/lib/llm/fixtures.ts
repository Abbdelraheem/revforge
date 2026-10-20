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
      component: "Backend Data Persistence",
      category: "database",
      status: "unknown_server_side",
      confidence: 0.85,
      detail: "Database tables synthesized from incoming/outgoing payload schemas.",
    },
  ],
  features: [
    {
      name: "Authentication & Session State",
      class: "auth",
      tier: "web_app",
      estimatedHours: 8,
      rationale: "Zero-trust session cookies with secure hashing and token verification.",
      optional: false,
    },
    {
      name: "Interactive Project Dashboard",
      class: "dashboard",
      tier: "web_app",
      estimatedHours: 12,
      rationale: "Data table listing projects with status indicators and search.",
      optional: false,
    },
    {
      name: "REST API Endpoint Suite",
      class: "api_integration",
      tier: "web_app",
      estimatedHours: 10,
      rationale: "Typed JSON API endpoints with Zod payload validation.",
      optional: false,
    },
  ],
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
  risksAndLimitations: ["Native C++ addons require clean-room TypeScript re-implementation."],
};
