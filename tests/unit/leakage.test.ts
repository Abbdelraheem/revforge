import { describe, it, expect } from "vitest";
import { scanCodebaseLeakage, calculateJaccardSimilarity, createShingles, LEAKAGE_SIMILARITY_THRESHOLD } from "@/lib/build/leakage";

describe("Codebase Leakage & IP Shingle Scanner", () => {
  it("computes accurate Jaccard similarity across k-shingles", () => {
    const textA = "function calculateInvoiceTotal(items) { return items.reduce((acc, x) => acc + x.price, 0); }";
    const textB = "function calculateInvoiceTotal(items) { return items.reduce((acc, x) => acc + x.price, 0); }";
    const textC = "export const getHealthStatus = () => ({ status: 'ok', uptime: process.uptime() });";

    const setA = createShingles(textA, 5);
    const setB = createShingles(textB, 5);
    const setC = createShingles(textC, 5);

    expect(calculateJaccardSimilarity(setA, setB)).toBe(1.0);
    expect(calculateJaccardSimilarity(setA, setC)).toBeLessThan(0.1);
  });

  it("detects verbatim and near-duplicate leakage exceeding 0.25 threshold", () => {
    const proprietaryReference = [
      "export class ProprietaryAlgorithm { private secretKey: string; constructor(k: string) { this.secretKey = k; } }",
    ];

    const leakedFile = {
      path: "src/algo.ts",
      content: "export class ProprietaryAlgorithm { private secretKey: string; constructor(k: string) { this.secretKey = k; } }",
    };

    const cleanFile = {
      path: "src/clean.ts",
      content: "export function cleanMathHelper(a: number, b: number): number { return a + b; }",
    };

    const leakedResult = scanCodebaseLeakage([leakedFile], proprietaryReference);
    expect(leakedResult.hasLeakage).toBe(true);
    expect(leakedResult.maxSimilarity).toBeGreaterThanOrEqual(LEAKAGE_SIMILARITY_THRESHOLD);

    const cleanResult = scanCodebaseLeakage([cleanFile], proprietaryReference);
    expect(cleanResult.hasLeakage).toBe(false);
    expect(cleanResult.maxSimilarity).toBeLessThan(LEAKAGE_SIMILARITY_THRESHOLD);
  });

  const stringPairs: Array<[string, string, boolean]> = [
    ["const a = 1; const b = 2; const c = 3; const d = 4;", "const a = 1; const b = 2; const c = 3; const d = 4;", true],
    ["function alphaOne() { return 100; }", "function betaTwo() { return 200; }", false],
    ["import fs from 'node:fs'; import path from 'node:path';", "import http from 'node:http'; import url from 'node:url';", false],
    ["export const config = { port: 3000, host: '0.0.0.0' };", "export const config = { port: 3000, host: '0.0.0.0' };", true],
    ["class Engine { start() { return true; } }", "class Service { stop() { return false; } }", false],
    ["interface UserProfile { id: string; name: string; email: string; }", "interface UserProfile { id: string; name: string; email: string; }", true],
    ["export function render() { return '<div>hello world</div>'; }", "export function display() { return '<span>goodbye world</span>'; }", false],
    ["export const MAX_RETRY_COUNT = 5; export const TIMEOUT_MS = 1000;", "export const MAX_RETRY_COUNT = 5; export const TIMEOUT_MS = 1000;", true],
    ["async function fetchAuthToken() { return 'token'; }", "async function clearAuthSession() { return true; }", false],
    ["export const STATUS_ACTIVE = 'active'; export const STATUS_IDLE = 'idle';", "export const STATUS_ACTIVE = 'active'; export const STATUS_IDLE = 'idle';", true],
  ];

  stringPairs.forEach(([s1, s2, isIdentical], idx) => {
    it(`checks minhash shingle similarity pair #${idx + 1}`, () => {
      const sh1 = createShingles(s1, 4);
      const sh2 = createShingles(s2, 4);
      const sim = calculateJaccardSimilarity(sh1, sh2);
      if (isIdentical) {
        expect(sim).toBeGreaterThanOrEqual(0.8);
      } else {
        expect(sim).toBeLessThan(0.5);
      }
    });
  });
});
