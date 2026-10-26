import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { findUnapprovedClaims, splitIntoSentences } from "@/lib/copy/claims";

interface ApprovedClaim {
  text: string;
  approved_by: string;
  date: string;
}

describe("Claims Guard Engine", () => {
  it("detects unapproved claims with risky marketing/legal patterns", () => {
    const text = "We deliver a 100% accurate system with a guarantee of zero errors and full ownership.";
    const unapproved = findUnapprovedClaims(text, []);
    expect(unapproved.length).toBeGreaterThan(0);
  });

  it("permits exact approved sentences from allowlist", () => {
    const approvedSentence = "Every project includes verified clean-room Next.js 15 source code with full commercial use rights.";
    const text = `${approvedSentence} Plus normal descriptive text.`;
    const unapproved = findUnapprovedClaims(text, [approvedSentence]);
    expect(unapproved).toEqual([]);
  });

  it("scans src/app and marketing docs copy without finding unapproved claims", () => {
    const allowlistPath = path.resolve(process.cwd(), "docs/approved-claims.json");
    expect(fs.existsSync(allowlistPath)).toBe(true);

    const approvedJson: ApprovedClaim[] = JSON.parse(
      fs.readFileSync(allowlistPath, "utf8")
    );
    const allowlist = approvedJson.map((entry) => entry.text);

    const violations: Array<{ file: string; sentence: string }> = [];

    // 1. Scan src/app
    function scanAppDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanAppDir(fullPath);
        } else if (/\.(tsx|jsx)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, "utf8");
          const found = findUnapprovedClaims(content, allowlist);
          for (const s of found) {
            violations.push({ file: fullPath, sentence: s });
          }
        }
      }
    }

    scanAppDir(path.resolve(process.cwd(), "src/app"));

    // 2. Scan marketing docs
    const marketingDocs = [
      path.resolve(process.cwd(), "docs/PRICING.md"),
      path.resolve(process.cwd(), "docs/QUALITY.md"),
      path.resolve(process.cwd(), "docs/STATUS.md"),
    ];

    for (const docPath of marketingDocs) {
      if (fs.existsSync(docPath)) {
        const content = fs.readFileSync(docPath, "utf8");
        const found = findUnapprovedClaims(content, allowlist);
        for (const s of found) {
          violations.push({ file: docPath, sentence: s });
        }
      }
    }

    if (violations.length > 0) {
      const report = violations
        .map((v) => `[${v.file}]: ${v.sentence}`)
        .join("\n");
      expect.fail(`Found ${violations.length} unapproved claims:\n${report}`);
    }
  });

  it("strictly forbids '100% intellectual property ownership' across all codebase files", () => {
    const forbiddenPattern = /100%\s*(intellectual property)?\s*ownership/i;
    function checkForbidden(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".next") continue;
          checkForbidden(fullPath);
        } else if (/\.(tsx|ts|jsx|js|md|json)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, "utf8");
          expect(
            forbiddenPattern.test(content),
            `Forbidden phrase '100% intellectual property ownership' found in ${fullPath}`
          ).toBe(false);
        }
      }
    }

    checkForbidden(path.resolve(process.cwd(), "src"));
    checkForbidden(path.resolve(process.cwd(), "docs"));
  });
});
