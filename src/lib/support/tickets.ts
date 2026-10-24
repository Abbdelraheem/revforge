import fs from "node:fs";
import path from "node:path";

export interface SupportTicket {
  id: string;
  name: string;
  email: string;
  organization?: string;
  inquiryType: string;
  message: string;
  status: "open" | "replied" | "closed";
  createdAt: string;
  updatedAt: string;
  reply?: string;
}

const STORAGE_FILE = path.join(process.cwd(), "data", "support-tickets.json");

function ensureStorageDir(): void {
  const dir = path.dirname(STORAGE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadTickets(): SupportTicket[] {
  try {
    ensureStorageDir();
    if (!fs.existsSync(STORAGE_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(STORAGE_FILE, "utf-8");
    return JSON.parse(raw) as SupportTicket[];
  } catch {
    return [];
  }
}

function saveTickets(tickets: SupportTicket[]): void {
  ensureStorageDir();
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(tickets, null, 2), "utf-8");
}

export function generateTicketId(): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TICK-${dateStr}-${rand}`;
}

export async function createSupportTicket(input: {
  name: string;
  email: string;
  organization?: string;
  inquiryType: string;
  message: string;
}): Promise<SupportTicket> {
  const tickets = loadTickets();
  const ticket: SupportTicket = {
    id: generateTicketId(),
    name: input.name.trim(),
    email: input.email.trim(),
    organization: input.organization?.trim(),
    inquiryType: input.inquiryType,
    message: input.message.trim(),
    status: "open",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  tickets.unshift(ticket);
  saveTickets(tickets);
  return ticket;
}

export async function listSupportTickets(): Promise<SupportTicket[]> {
  return loadTickets();
}

export async function getSupportTicket(id: string): Promise<SupportTicket | null> {
  const tickets = loadTickets();
  return tickets.find((t) => t.id === id) ?? null;
}

export async function updateSupportTicket(
  id: string,
  updates: Partial<Pick<SupportTicket, "status" | "reply">>
): Promise<SupportTicket | null> {
  const tickets = loadTickets();
  const index = tickets.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const current = tickets[index];
  if (!current) return null;

  const updated: SupportTicket = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  tickets[index] = updated;
  saveTickets(tickets);
  return updated;
}

export const CANNED_REPLIES = [
  {
    id: "clean-room",
    title: "Clean-room verification & parity rubric",
    body: "Thank you for reaching out. We synthesize codebases under strict clean-room isolation without ingesting proprietary source code. Verification is conducted via pixelmatch visual comparison, route structure matching, and sandbox build execution.",
  },
  {
    id: "upload-formats",
    title: "Target ingestion formats (.har, .apk, web URL)",
    body: "We support public HTTPS URLs for web crawling, .har network recordings for single-page applications, .apk bundles for Android disassembly, and .asar archives for Electron applications. Please ensure your target is under 50MB.",
  },
  {
    id: "pricing-formula",
    title: "Pricing calculation & 50% market discount",
    body: "All rebuild orders are calculated directly from estimated engineering scope: hours × market rate × 0.5. The first architectural analysis is complimentary, and subsequent analyses ($5) are credited back upon build checkout.",
  },
  {
    id: "ip-attestation",
    title: "Attestation & legal authorization requirements",
    body: "To comply with our Clean-Room Intellectual Property Policy, customers must certify either ownership, written authorization from the rights holder, or a valid statutory interoperability exception before checkout.",
  },
];
