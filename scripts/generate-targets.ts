import fs from "node:fs";
import path from "node:path";
import { BenchmarkManifest } from "../src/config/quality";

interface TargetDefinition extends BenchmarkManifest {
  files: Record<string, string>;
}

const TARGETS: TargetDefinition[] = [
  {
    id: "01-static-landing",
    name: "Nova SaaS Landing Page",
    difficultyTier: "landing",
    targetType: "web",
    entryPoint: "index.html",
    expectedRoutes: ["/"],
    expectedFeatures: [
      "Hero section with CTA",
      "Feature highlights grid",
      "Pricing cards",
      "FAQ accordion",
      "Footer navigation",
    ],
    estimatedHours: 2.5,
    scriptedEdits: [
      {
        id: "edit-1",
        instruction: "Change primary theme color to emerald #059669",
        checkType: "contains_text",
        targetFile: "styles.css",
        expectedPattern: "#059669",
      },
      {
        id: "edit-2",
        instruction: "Add an About section to landing page",
        checkType: "contains_text",
        targetFile: "index.html",
        expectedPattern: 'id="about"',
      },
      {
        id: "edit-3",
        instruction: "Fix newsletter form validation",
        checkType: "contains_text",
        targetFile: "index.html",
        expectedPattern: "required",
      },
    ],
    files: {
      "package.json": JSON.stringify(
        {
          name: "nova-landing",
          version: "1.0.0",
          scripts: { build: "node -e 'process.exit(0)'", test: "node -e 'process.exit(0)'" },
        },
        null,
        2
      ),
      "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Nova SaaS</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>
    <h1>Nova</h1>
    <nav>
      <a href="#features">Features</a>
      <a href="#pricing">Pricing</a>
    </nav>
  </header>
  <main>
    <section class="hero">
      <h2>Modern Software Delivery</h2>
      <p>Scale effortlessly without infrastructure debt.</p>
      <button class="cta">Get Started</button>
    </section>
    <section id="features">
      <h3>Features</h3>
      <p>Fast, reliable, scalable reverse engineering.</p>
    </section>
    <section id="pricing">
      <h3>Pricing</h3>
      <div class="plan">
        <h4>Standard</h4>
        <span>$29/mo</span>
      </div>
    </section>
    <form id="newsletter">
      <input type="email" name="email" placeholder="Your work email" required />
      <button type="submit">Subscribe</button>
    </form>
  </main>
  <footer>
    <p>&copy; 2026 Nova Technologies</p>
  </footer>
  <script src="main.js"></script>
</body>
</html>`,
      "styles.css": `:root {
  --primary: #2563eb;
}
body {
  font-family: system-ui, sans-serif;
  margin: 0;
  padding: 1.5rem;
}
.cta {
  background: var(--primary);
  color: #ffffff;
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}`,
      "main.js": `console.log("Nova landing initialized");`,
    },
  },
  {
    id: "02-multipage-marketing",
    name: "Aura Cloud Marketing Site",
    difficultyTier: "multi-page",
    targetType: "web",
    entryPoint: "index.html",
    expectedRoutes: ["/", "/about", "/pricing", "/contact"],
    expectedFeatures: [
      "Multi-page navigation",
      "Tiered pricing plans",
      "Contact inquiry form",
      "Team bio profiles",
    ],
    estimatedHours: 4.5,
    scriptedEdits: [
      {
        id: "edit-1",
        instruction: "Change primary color to indigo #4f46e5",
        checkType: "contains_text",
        targetFile: "styles.css",
        expectedPattern: "#4f46e5",
      },
      {
        id: "edit-2",
        instruction: "Add milestone timeline to about page",
        checkType: "contains_text",
        targetFile: "about.html",
        expectedPattern: "timeline",
      },
      {
        id: "edit-3",
        instruction: "Fix contact form phone validation",
        checkType: "contains_text",
        targetFile: "contact.html",
        expectedPattern: 'type="tel"',
      },
    ],
    files: {
      "package.json": JSON.stringify(
        {
          name: "aura-marketing",
          version: "1.0.0",
          scripts: { build: "node -e 'process.exit(0)'", test: "node -e 'process.exit(0)'" },
        },
        null,
        2
      ),
      "index.html": `<!DOCTYPE html>
<html>
<head><title>Aura Cloud</title><link rel="stylesheet" href="styles.css"></head>
<body>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/pricing">Pricing</a>
    <a href="/contact">Contact</a>
  </nav>
  <h1>Aura Cloud</h1>
  <p>Enterprise infrastructure made simple.</p>
</body>
</html>`,
      "about.html": `<!DOCTYPE html>
<html>
<head><title>About Aura</title><link rel="stylesheet" href="styles.css"></head>
<body>
  <h1>About Aura</h1>
  <p>Founded in 2024 to simplify operations and cloud management.</p>
</body>
</html>`,
      "pricing.html": `<!DOCTYPE html>
<html>
<head><title>Pricing</title><link rel="stylesheet" href="styles.css"></head>
<body>
  <h1>Pricing Plans</h1>
  <p>Transparent tiers for startups and teams.</p>
</body>
</html>`,
      "contact.html": `<!DOCTYPE html>
<html>
<head><title>Contact</title><link rel="stylesheet" href="styles.css"></head>
<body>
  <h1>Contact Us</h1>
  <form id="contact-form">
    <input type="text" name="name" required />
    <input type="email" name="email" required />
    <textarea name="message" required></textarea>
    <button type="submit">Send</button>
  </form>
</body>
</html>`,
      "styles.css": `:root { --color-primary: #3b82f6; } body { font-family: sans-serif; line-height: 1.5; }`,
    },
  },
  {
    id: "03-spa-dashboard",
    name: "Pulse Analytics Dashboard",
    difficultyTier: "dashboard",
    targetType: "web",
    entryPoint: "index.html",
    expectedRoutes: ["/", "/analytics", "/settings"],
    expectedFeatures: [
      "Metric KPI summary cards",
      "Visual trend charts",
      "Paginated data table",
      "API stubs /api/metrics",
    ],
    estimatedHours: 8.0,
    scriptedEdits: [
      {
        id: "edit-1",
        instruction: "Change chart color to amber #d97706",
        checkType: "contains_text",
        targetFile: "dashboard.css",
        expectedPattern: "#d97706",
      },
      {
        id: "edit-2",
        instruction: "Add export data button to dashboard",
        checkType: "contains_text",
        targetFile: "index.html",
        expectedPattern: "Export CSV",
      },
      {
        id: "edit-3",
        instruction: "Fix table filter search debounce",
        checkType: "contains_text",
        targetFile: "app.js",
        expectedPattern: "debounce",
      },
    ],
    files: {
      "package.json": JSON.stringify(
        {
          name: "pulse-dashboard",
          version: "1.0.0",
          scripts: { build: "node -e 'process.exit(0)'", test: "node -e 'process.exit(0)'" },
        },
        null,
        2
      ),
      "index.html": `<!DOCTYPE html>
<html>
<head><title>Pulse Analytics</title><link rel="stylesheet" href="dashboard.css"></head>
<body>
  <div class="sidebar">
    <nav>
      <a href="#/">Overview</a>
      <a href="#/analytics">Analytics</a>
      <a href="#/settings">Settings</a>
    </nav>
  </div>
  <main>
    <h1>Pulse Dashboard</h1>
    <div class="kpis">
      <div class="card">Active Users: 1,240</div>
      <div class="card">Conversion: 4.8%</div>
    </div>
    <div class="chart" id="chart"></div>
    <table id="events">
      <thead><tr><th>ID</th><th>User</th><th>Action</th></tr></thead>
      <tbody><tr><td>1</td><td>user_1</td><td>login</td></tr></tbody>
    </table>
  </main>
  <script src="app.js"></script>
</body>
</html>`,
      "dashboard.css": `.sidebar { width: 220px; float: left; } main { margin-left: 240px; } .card { padding: 1rem; border: 1px solid #ccc; display: inline-block; margin-right: 1rem; }`,
      "app.js": `function loadMetrics() { return fetch("/api/metrics").catch(() => ({ users: 1240 })); } loadMetrics();`,
    },
  },
  {
    id: "04-blog-cms",
    name: "Markdown Tech Journal",
    difficultyTier: "content",
    targetType: "web",
    entryPoint: "index.html",
    expectedRoutes: ["/", "/blog", "/blog/first-post", "/tags"],
    expectedFeatures: [
      "Article feed listing",
      "Markdown renderer",
      "Tag filter categories",
      "Estimated reading time",
    ],
    estimatedHours: 5.0,
    scriptedEdits: [
      {
        id: "edit-1",
        instruction: "Change link highlight color to sky #0284c7",
        checkType: "contains_text",
        targetFile: "blog.css",
        expectedPattern: "#0284c7",
      },
      {
        id: "edit-2",
        instruction: "Add author bio section to blog post",
        checkType: "contains_text",
        targetFile: "post.html",
        expectedPattern: 'class="author-bio"',
      },
      {
        id: "edit-3",
        instruction: "Fix search bar empty query check",
        checkType: "contains_text",
        targetFile: "blog.js",
        expectedPattern: "trim()",
      },
    ],
    files: {
      "package.json": JSON.stringify(
        {
          name: "tech-journal",
          version: "1.0.0",
          scripts: { build: "node -e 'process.exit(0)'", test: "node -e 'process.exit(0)'" },
        },
        null,
        2
      ),
      "index.html": `<!DOCTYPE html>
<html>
<head><title>Tech Journal</title><link rel="stylesheet" href="blog.css"></head>
<body>
  <header><h1>Tech Journal</h1></header>
  <main>
    <article>
      <h2><a href="post.html">Building Resilient Systems</a></h2>
      <p>Lessons learned in high-throughput pipelines.</p>
      <span class="tag">architecture</span>
    </article>
  </main>
  <script src="blog.js"></script>
</body>
</html>`,
      "post.html": `<!DOCTYPE html>
<html>
<head><title>Building Resilient Systems</title><link rel="stylesheet" href="blog.css"></head>
<body>
  <h1>Building Resilient Systems</h1>
  <p>Full article body here...</p>
</body>
</html>`,
      "blog.css": `body { font-family: serif; max-width: 720px; margin: auto; line-height: 1.6; } a { color: #1d4ed8; }`,
      "blog.js": `document.querySelectorAll("article").forEach(a => console.log(a.innerText));`,
    },
  },
  {
    id: "05-ecommerce-demo",
    name: "Kite Minimalist Storefront",
    difficultyTier: "ecommerce",
    targetType: "web",
    entryPoint: "index.html",
    expectedRoutes: ["/", "/products", "/cart", "/checkout"],
    expectedFeatures: [
      "Product grid gallery",
      "Slide-over cart state",
      "Item quantity modifiers",
      "Checkout order summary",
    ],
    estimatedHours: 10.0,
    scriptedEdits: [
      {
        id: "edit-1",
        instruction: "Change primary button color to teal #0d9488",
        checkType: "contains_text",
        targetFile: "store.css",
        expectedPattern: "#0d9488",
      },
      {
        id: "edit-2",
        instruction: "Add promo code input field to cart",
        checkType: "contains_text",
        targetFile: "cart.html",
        expectedPattern: 'id="promo-code"',
      },
      {
        id: "edit-3",
        instruction: "Fix checkout postal code format validation",
        checkType: "contains_text",
        targetFile: "checkout.js",
        expectedPattern: "postalCode",
      },
    ],
    files: {
      "package.json": JSON.stringify(
        {
          name: "kite-store",
          version: "1.0.0",
          scripts: { build: "node -e 'process.exit(0)'", test: "node -e 'process.exit(0)'" },
        },
        null,
        2
      ),
      "index.html": `<!DOCTYPE html>
<html>
<head><title>Kite Store</title><link rel="stylesheet" href="store.css"></head>
<body>
  <h1>Kite Goods</h1>
  <div class="products">
    <div class="product">
      <h3>Desk Lamp</h3>
      <p>$48</p>
      <button class="add-to-cart">Add to Cart</button>
    </div>
  </div>
</body>
</html>`,
      "cart.html": `<!DOCTYPE html>
<html>
<head><title>Cart</title></head>
<body>
  <h2>Your Cart</h2>
  <div id="cart-items"></div>
  <a href="checkout.html">Proceed to Checkout</a>
</body>
</html>`,
      "checkout.html": `<!DOCTYPE html>
<html>
<head><title>Checkout</title></head>
<body>
  <h2>Checkout</h2>
  <form id="checkout-form">
    <input name="address" required />
    <input name="city" required />
    <button type="submit">Pay</button>
  </form>
  <script src="checkout.js"></script>
</body>
</html>`,
      "store.css": `.product { border: 1px solid #e5e7eb; padding: 1rem; border-radius: 6px; } .add-to-cart { background: #0f172a; color: #fff; }`,
      "checkout.js": `console.log("Checkout ready");`,
    },
  },
  {
    id: "06-auth-crud",
    name: "TaskFlow Workspace Manager",
    difficultyTier: "crud",
    targetType: "web",
    entryPoint: "index.html",
    expectedRoutes: ["/", "/login", "/tasks", "/tasks/new"],
    expectedFeatures: [
      "Authentication form",
      "Task item listing",
      "Task create/edit form",
      "Task deletion and status toggle",
    ],
    estimatedHours: 7.5,
    scriptedEdits: [
      {
        id: "edit-1",
        instruction: "Change high priority badge color to red #ef4444",
        checkType: "contains_text",
        targetFile: "taskflow.css",
        expectedPattern: "#ef4444",
      },
      {
        id: "edit-2",
        instruction: "Add due date field to task creation form",
        checkType: "contains_text",
        targetFile: "new-task.html",
        expectedPattern: 'type="date"',
      },
      {
        id: "edit-3",
        instruction: "Fix empty task title check on submit",
        checkType: "contains_text",
        targetFile: "tasks.js",
        expectedPattern: "title.trim()",
      },
    ],
    files: {
      "package.json": JSON.stringify(
        {
          name: "taskflow-app",
          version: "1.0.0",
          scripts: { build: "node -e 'process.exit(0)'", test: "node -e 'process.exit(0)'" },
        },
        null,
        2
      ),
      "index.html": `<!DOCTYPE html>
<html>
<head><title>TaskFlow</title><link rel="stylesheet" href="taskflow.css"></head>
<body>
  <h1>TaskFlow</h1>
  <div id="auth-state">Logged in as demo@taskflow.dev</div>
  <ul id="task-list">
    <li>Complete audit <span class="badge high">High</span></li>
  </ul>
  <a href="new-task.html">New Task</a>
  <script src="tasks.js"></script>
</body>
</html>`,
      "new-task.html": `<!DOCTYPE html>
<html>
<head><title>Create Task</title></head>
<body>
  <form id="create-task-form">
    <input type="text" name="title" placeholder="Title" required />
    <button type="submit">Save</button>
  </form>
</body>
</html>`,
      "taskflow.css": `.badge { font-size: 0.8rem; padding: 2px 6px; border-radius: 4px; } .high { background: #dc2626; color: white; }`,
      "tasks.js": `const tasks = [{ id: 1, title: "Complete audit", priority: "high" }];`,
    },
  },
  {
    id: "07-pwa-offline",
    name: "CacheFirst Weather PWA",
    difficultyTier: "pwa",
    targetType: "pwa",
    entryPoint: "index.html",
    expectedRoutes: ["/", "/offline", "/settings"],
    expectedFeatures: [
      "Web App Manifest configuration",
      "Service Worker cache registration",
      "Offline fallback screen",
      "Temperature unit toggle",
    ],
    estimatedHours: 4.0,
    scriptedEdits: [
      {
        id: "edit-1",
        instruction: "Change theme_color in manifest to #0284c7",
        checkType: "contains_text",
        targetFile: "manifest.webmanifest",
        expectedPattern: "#0284c7",
      },
      {
        id: "edit-2",
        instruction: "Add reload button to offline banner",
        checkType: "contains_text",
        targetFile: "offline.html",
        expectedPattern: "location.reload()",
      },
      {
        id: "edit-3",
        instruction: "Fix service worker cache name versioning",
        checkType: "contains_text",
        targetFile: "sw.js",
        expectedPattern: "v2",
      },
    ],
    files: {
      "package.json": JSON.stringify(
        {
          name: "weather-pwa",
          version: "1.0.0",
          scripts: { build: "node -e 'process.exit(0)'", test: "node -e 'process.exit(0)'" },
        },
        null,
        2
      ),
      "index.html": `<!DOCTYPE html>
<html>
<head><title>Weather PWA</title><link rel="manifest" href="manifest.webmanifest"></head>
<body>
  <h1>Current Weather</h1>
  <div id="temp">22&deg;C</div>
  <script>if ("serviceWorker" in navigator) { navigator.serviceWorker.register("/sw.js"); }</script>
</body>
</html>`,
      "offline.html": `<!DOCTYPE html>
<html>
<head><title>Offline</title></head>
<body>
  <h2>You are currently offline</h2>
  <p>Data will sync when connection returns.</p>
</body>
</html>`,
      "manifest.webmanifest": JSON.stringify(
        {
          name: "Weather PWA",
          short_name: "Weather",
          theme_color: "#0ea5e9",
          display: "standalone",
        },
        null,
        2
      ),
      "sw.js": `const CACHE_NAME = "weather-v1"; self.addEventListener("install", e => e.waitUntil(caches.open(CACHE_NAME)));`,
    },
  },
  {
    id: "08-har-capture",
    name: "Acme Payments Network Flow (HAR)",
    difficultyTier: "har",
    targetType: "har",
    entryPoint: "session.har",
    expectedRoutes: ["/", "/api/checkout", "/api/verify"],
    expectedFeatures: [
      "HAR v1.2 log specification",
      "POST /api/checkout JSON transaction",
      "GET /api/verify signature check",
      "Response status inspection",
    ],
    estimatedHours: 6.0,
    scriptedEdits: [
      {
        id: "edit-1",
        instruction: "Change default currency in payment schema to EUR",
        checkType: "contains_text",
        targetFile: "session.har",
        expectedPattern: "EUR",
      },
      {
        id: "edit-2",
        instruction: "Add webhook notification URL parameter",
        checkType: "contains_text",
        targetFile: "session.har",
        expectedPattern: "webhook_url",
      },
      {
        id: "edit-3",
        instruction: "Fix payment timeout retry handling",
        checkType: "contains_text",
        targetFile: "client.js",
        expectedPattern: "maxRetries",
      },
    ],
    files: {
      "package.json": JSON.stringify(
        {
          name: "payments-har",
          version: "1.0.0",
          scripts: { build: "node -e 'process.exit(0)'", test: "node -e 'process.exit(0)'" },
        },
        null,
        2
      ),
      "session.har": JSON.stringify(
        {
          log: {
            version: "1.2",
            creator: { name: "RevForge HarCapture", version: "1.0" },
            entries: [
              {
                startedDateTime: "2026-10-24T00:00:00.000Z",
                time: 120,
                request: {
                  method: "POST",
                  url: "https://api.acmepayments.test/api/checkout",
                  headers: [{ name: "Content-Type", value: "application/json" }],
                  postData: {
                    mimeType: "application/json",
                    text: JSON.stringify({ amount: 5000, currency: "USD" }),
                  },
                },
                response: {
                  status: 200,
                  statusText: "OK",
                  headers: [{ name: "Content-Type", value: "application/json" }],
                  content: {
                    mimeType: "application/json",
                    text: JSON.stringify({ id: "chk_123", status: "pending" }),
                  },
                },
              },
            ],
          },
        },
        null,
        2
      ),
      "client.js": `async function checkout(payload) { return fetch("/api/checkout", { method: "POST", body: JSON.stringify(payload) }); }`,
    },
  },
  {
    id: "09-electron-asar",
    name: "DeskNotes Lightweight Desktop App",
    difficultyTier: "desktop",
    targetType: "asar",
    entryPoint: "main.js",
    expectedRoutes: ["/"],
    expectedFeatures: [
      "Electron application entrypoint",
      "Preload context bridge isolation",
      "Renderer markdown editing canvas",
      "Local storage persistence",
    ],
    estimatedHours: 8.5,
    scriptedEdits: [
      {
        id: "edit-1",
        instruction: "Change default window width to 1024",
        checkType: "contains_text",
        targetFile: "main.js",
        expectedPattern: "1024",
      },
      {
        id: "edit-2",
        instruction: "Add export notes menu item",
        checkType: "contains_text",
        targetFile: "main.js",
        expectedPattern: "Export Notes",
      },
      {
        id: "edit-3",
        instruction: "Fix IPC bridge message argument validation",
        checkType: "contains_text",
        targetFile: "preload.js",
        expectedPattern: "typeof",
      },
    ],
    files: {
      "package.json": JSON.stringify(
        {
          name: "desknotes-desktop",
          version: "1.0.0",
          main: "main.js",
          scripts: { build: "node -e 'process.exit(0)'", test: "node -e 'process.exit(0)'" },
        },
        null,
        2
      ),
      "main.js": `const { app, BrowserWindow } = require("electron");
function createWindow() {
  const win = new BrowserWindow({ width: 800, height: 600, webPreferences: { preload: "preload.js" } });
  win.loadFile("index.html");
}
app.whenReady?.().then?.(createWindow);`,
      "preload.js": `const { contextBridge, ipcRenderer } = require("electron");
contextBridge?.exposeInMainWorld?.("desktopApi", {
  send: (ch, data) => ipcRenderer?.send?.(ch, data)
});`,
      "index.html": `<!DOCTYPE html><html><head><title>DeskNotes</title></head><body><h1>DeskNotes</h1><textarea id="note"></textarea></body></html>`,
    },
  },
  {
    id: "10-mobile-apk",
    name: "Compass Mini Android Sample",
    difficultyTier: "mobile",
    targetType: "apk",
    entryPoint: "AndroidManifest.xml",
    expectedRoutes: ["/main", "/calibration"],
    expectedFeatures: [
      "Android manifest XML definition",
      "Sensor hardware listener stub",
      "Fine location permission tag",
      "Vector compass indicator",
    ],
    estimatedHours: 7.0,
    scriptedEdits: [
      {
        id: "edit-1",
        instruction: "Change application label to Precision Compass",
        checkType: "contains_text",
        targetFile: "AndroidManifest.xml",
        expectedPattern: "Precision Compass",
      },
      {
        id: "edit-2",
        instruction: "Add vibration permission to AndroidManifest",
        checkType: "contains_text",
        targetFile: "AndroidManifest.xml",
        expectedPattern: "android.permission.VIBRATE",
      },
      {
        id: "edit-3",
        instruction: "Fix sensor accuracy calibration check",
        checkType: "contains_text",
        targetFile: "resources.json",
        expectedPattern: "calibrationThreshold",
      },
    ],
    files: {
      "package.json": JSON.stringify(
        {
          name: "compass-mini",
          version: "1.0.0",
          scripts: { build: "node -e 'process.exit(0)'", test: "node -e 'process.exit(0)'" },
        },
        null,
        2
      ),
      "AndroidManifest.xml": `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.example.compass">
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <application android:label="Compass Mini">
        <activity android:name=".MainActivity">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
            </intent-filter>
        </activity>
    </application>
</manifest>`,
      "resources.json": JSON.stringify(
        { defaultDegrees: 0, sensorPollingMs: 50 },
        null,
        2
      ),
    },
  },
  {
    id: "11-doc-portal",
    name: "RevForge Developer Documentation Portal",
    difficultyTier: "documentation",
    targetType: "web",
    entryPoint: "index.html",
    expectedRoutes: ["/", "/docs/getting-started", "/docs/api", "/docs/faq"],
    expectedFeatures: [
      "Collapsible sidebar navigation tree",
      "Code snippet clipboard copy action",
      "On-page heading table of contents",
      "Instant search bar modal",
    ],
    estimatedHours: 6.5,
    scriptedEdits: [
      {
        id: "edit-1",
        instruction: "Change code snippet background color to #18181b",
        checkType: "contains_text",
        targetFile: "docs.css",
        expectedPattern: "#18181b",
      },
      {
        id: "edit-2",
        instruction: "Add rate limits section to api docs",
        checkType: "contains_text",
        targetFile: "api.html",
        expectedPattern: "Rate Limits",
      },
      {
        id: "edit-3",
        instruction: "Fix copy snippet button tooltip duration",
        checkType: "contains_text",
        targetFile: "docs.js",
        expectedPattern: "setTimeout",
      },
    ],
    files: {
      "package.json": JSON.stringify(
        {
          name: "dev-docs-portal",
          version: "1.0.0",
          scripts: { build: "node -e 'process.exit(0)'", test: "node -e 'process.exit(0)'" },
        },
        null,
        2
      ),
      "index.html": `<!DOCTYPE html>
<html>
<head><title>RevForge Docs</title><link rel="stylesheet" href="docs.css"></head>
<body>
  <aside>
    <nav>
      <a href="/">Overview</a>
      <a href="getting-started.html">Getting Started</a>
      <a href="api.html">API Reference</a>
    </nav>
  </aside>
  <main>
    <h1>Documentation</h1>
    <p>Welcome to developer documentation.</p>
  </main>
  <script src="docs.js"></script>
</body>
</html>`,
      "getting-started.html": `<!DOCTYPE html><html><head><title>Getting Started</title></head><body><h1>Getting Started</h1><pre><code>npm install</code></pre></body></html>`,
      "api.html": `<!DOCTYPE html><html><head><title>API Reference</title></head><body><h1>API Reference</h1><p>RESTful APIs and contracts.</p></body></html>`,
      "docs.css": `aside { width: 260px; float: left; border-right: 1px solid #e5e7eb; } main { margin-left: 280px; } pre code { background: #09090b; color: #fff; padding: 1rem; display: block; }`,
      "docs.js": `console.log("Docs search ready");`,
    },
  },
  {
    id: "12-portfolio-showcase",
    name: "Studio Artisan Portfolio",
    difficultyTier: "portfolio",
    targetType: "web",
    entryPoint: "index.html",
    expectedRoutes: ["/", "/projects", "/project/case-study", "/contact"],
    expectedFeatures: [
      "Hero brand introduction",
      "Category filterable project grid",
      "Case study modal viewer",
      "Client inquiry request form",
    ],
    estimatedHours: 5.5,
    scriptedEdits: [
      {
        id: "edit-1",
        instruction: "Change accent color to violet #7c3aed",
        checkType: "contains_text",
        targetFile: "portfolio.css",
        expectedPattern: "#7c3aed",
      },
      {
        id: "edit-2",
        instruction: "Add awards recognition section",
        checkType: "contains_text",
        targetFile: "index.html",
        expectedPattern: 'id="awards"',
      },
      {
        id: "edit-3",
        instruction: "Fix inquiry budget select validation",
        checkType: "contains_text",
        targetFile: "contact.html",
        expectedPattern: "required",
      },
    ],
    files: {
      "package.json": JSON.stringify(
        {
          name: "artisan-portfolio",
          version: "1.0.0",
          scripts: { build: "node -e 'process.exit(0)'", test: "node -e 'process.exit(0)'" },
        },
        null,
        2
      ),
      "index.html": `<!DOCTYPE html>
<html>
<head><title>Artisan Studio</title><link rel="stylesheet" href="portfolio.css"></head>
<body>
  <header>
    <h1>Artisan Studio</h1>
    <p>Crafting bespoke digital products.</p>
  </header>
  <section class="grid">
    <div class="item"><h3>Fintech Redesign</h3><span>Case study</span></div>
  </section>
  <a href="contact.html">Start a Project</a>
</body>
</html>`,
      "contact.html": `<!DOCTYPE html><html><head><title>Contact Artisan</title></head><body><h1>Let us talk</h1><form><input name="client" required /><select name="budget"><option value="10k">$10k-$25k</option></select><button type="submit">Submit</button></form></body></html>`,
      "portfolio.css": `:root { --accent: #6d28d9; } body { font-family: serif; } .grid { display: flex; gap: 1rem; }`,
      "main.js": `console.log("Portfolio interactive scripts");`,
    },
  },
];

async function main() {
  const rootDir = path.resolve(process.cwd(), "benchmarks/targets");
  if (!fs.existsSync(rootDir)) {
    fs.mkdirSync(rootDir, { recursive: true });
  }

  for (const target of TARGETS) {
    const dir = path.join(rootDir, target.id);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const { files, ...manifest } = target;
    fs.writeFileSync(
      path.join(dir, "manifest.json"),
      JSON.stringify(manifest, null, 2),
      "utf8"
    );

    for (const [filename, content] of Object.entries(files)) {
      const fullPath = path.join(dir, filename);
      const fileDir = path.dirname(fullPath);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      fs.writeFileSync(fullPath, content, "utf8");
    }
  }

  console.log(`Generated ${TARGETS.length} benchmark targets in ${rootDir}`);
}

main().catch((err) => {
  console.error("Failed to generate targets:", err);
  process.exit(1);
});
