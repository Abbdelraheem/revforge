import { describe, it, expect } from "vitest";
import { ALLOWED_TRANSITIONS, ProjectStatus } from "@/db/state-machine";

describe("Project State Machine Transition Suite", () => {
  it("allows valid forward transitions by authorized actors", () => {
    // draft -> analyzing allowed by user
    expect(ALLOWED_TRANSITIONS.draft.analyzing).toContain("user");

    // analyzing -> analyzed allowed by analysis_worker
    expect(ALLOWED_TRANSITIONS.analyzing.analyzed).toContain("analysis_worker");

    // awaiting_payment -> paid allowed by webhook or system
    expect(ALLOWED_TRANSITIONS.awaiting_payment.paid).toContain("webhook");
    expect(ALLOWED_TRANSITIONS.awaiting_payment.paid).toContain("system");

    // paid -> queued
    expect(ALLOWED_TRANSITIONS.paid.queued).toContain("system");

    // queued -> building
    expect(ALLOWED_TRANSITIONS.queued.building).toContain("build_worker");

    // verifying -> delivered
    expect(ALLOWED_TRANSITIONS.verifying.delivered).toContain("build_worker");
  });

  it("disallows illegal jumps or unauthorized actors", () => {
    // Cannot jump directly from draft to delivered
    expect((ALLOWED_TRANSITIONS.draft as any).delivered).toBeUndefined();

    // Cannot jump from analyzed directly to building without payment
    expect((ALLOWED_TRANSITIONS.analyzed as any).building).toBeUndefined();

    // User cannot transition project directly to paid without webhook/system
    expect(ALLOWED_TRANSITIONS.awaiting_payment.paid).not.toContain("user");
  });

  const legalTransitions: Array<[ProjectStatus, ProjectStatus, string]> = [
    ["draft", "analyzing", "user"],
    ["draft", "cancelled", "user"],
    ["analyzing", "analyzed", "analysis_worker"],
    ["analyzing", "analysis_failed", "analysis_worker"],
    ["analyzing", "cancelled", "user"],
    ["analyzed", "awaiting_payment", "user"],
    ["analyzed", "cancelled", "user"],
    ["analysis_failed", "draft", "user"],
    ["analysis_failed", "cancelled", "user"],
    ["awaiting_payment", "paid", "webhook"],
    ["awaiting_payment", "cancelled", "user"],
    ["paid", "queued", "system"],
    ["queued", "building", "build_worker"],
    ["queued", "cancelled", "system"],
    ["building", "verifying", "build_worker"],
    ["building", "build_failed", "build_worker"],
    ["verifying", "delivered", "build_worker"],
    ["verifying", "delivered_partial", "build_worker"],
    ["verifying", "build_failed", "build_worker"],
  ];

  legalTransitions.forEach(([from, to, actor]) => {
    it(`validates legal transition ${from} -> ${to} by ${actor}`, () => {
      expect((ALLOWED_TRANSITIONS[from] as any)[to]).toContain(actor);
    });
  });

  const illegalTransitions: Array<[ProjectStatus, ProjectStatus]> = [
    ["draft", "delivered"],
    ["draft", "paid"],
    ["draft", "building"],
    ["analyzing", "paid"],
    ["analyzed", "delivered"],
    ["awaiting_payment", "delivered"],
    ["paid", "delivered"],
    ["queued", "delivered"],
    ["cancelled", "building"],
    ["delivered", "building"],
  ];

  illegalTransitions.forEach(([from, to]) => {
    it(`strictly forbids illegal transition ${from} -> ${to}`, () => {
      expect((ALLOWED_TRANSITIONS[from] as any)[to]).toBeUndefined();
    });
  });
});
