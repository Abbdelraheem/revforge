# RevForge AI — Architecture & Design Decisions Log

- **DEC-001**: Selected Next.js 15 App Router with Server Actions and React 19 for maximum streaming performance and zero client-bundle bloat.
- **DEC-002**: Selected PostgreSQL with Drizzle ORM and Row-Level Security (RLS) over Prisma for raw query control, type-safe SQL, and zero cold-start overhead.
- **DEC-003**: Enforced Zero-Shell execution (`child_process.execFile` strictly with `shell: false`) to permanently eliminate command injection.
- **DEC-004**: Selected Deep Emerald / Forest Slate (`#059669` / `hsl(160, 84%, 39%)`) as the primary brand accent color: communicates high engineering precision, monetary clarity, and verified trust without tacky neon purple/blue AI cliches.
- **DEC-005**: Implemented dual-mode payment gateway abstraction supporting Stripe and Paddle with cryptographic webhook verification (`Paddle-Signature` / `stripe-signature`) before unlocking clean-room synthesis.
- **DEC-006**: Implemented `MOCK_SANDBOX=true` mode to allow 100% end-to-end development, verification, and demo execution without requiring local Ghidra/gVisor installations.
- **DEC-007**: Structured layout into Route Groups: `(marketing)` for public pages, `(auth)` for authentication, `(app)` for SaaS dashboard/projects, and `(admin)` for platform operators.
- **DEC-008**: Chose `IBM Plex Sans Arabic` for Arabic UI, `Inter` for Latin typography, and `JetBrains Mono` for hashes, code snippets, and terminal streams.
- **DEC-009**: Adopted Integer-Cent pricing arithmetic on server-side to completely prevent floating-point rounding errors in financial transactions.
- **DEC-010**: Enforced strict Zod environment validation in `src/env.ts` that terminates boot immediately if mission-critical environment variables are missing or malformed in production.
- **DEC-011**: Hard-banned all AI neon gradient headings, glowing orbs, sparkle emojis, and glassmorphism in favor of a restrained "technical editorial" aesthetic (Linear/Stripe-inspired).
- **DEC-012**: Established Deep Forest Emerald (`hsl(160, 84%, 36%)`) as the primary brand accent: high authority, WCAG AA compliant, zero neon cliches.
- **DEC-013**: Configured Google Fonts via `next/font`: `Inter` (Latin), `IBM Plex Sans Arabic` (Arabic), and `JetBrains Mono` (code/hashes/metrics) with zero layout shift.
- **DEC-014**: Adopted strict CSS logical properties (`margin-inline-start`, `padding-inline-end`, etc.) and LTR code islands (`dir="ltr"`) for seamless RTL/LTR parity.
- **DEC-015**: Extracted full clean-room reverse engineering studio into dedicated authenticated route `src/app/(app)/dashboard/page.tsx` with Stepper, Dropzone, and SSE stream.
- **DEC-016**: Built interactive mini-triage console on the marketing landing page (`src/app/page.tsx`) enabling zero-friction live target testing and real-time 90% margin calculations.
- **DEC-017**: Authored comprehensive legal and governance surface (`clean-room-ip-policy`, `terms`, `privacy`, `acceptable-use`, `dmca`) codifying US/EU clean-room reverse engineering doctrine.
- **DEC-018**: Deployed Next.js 15 metadata sitemap (`sitemap.ts`), `robots.ts`, and technical editorial error boundaries (`not-found.tsx`, `error.tsx`).
