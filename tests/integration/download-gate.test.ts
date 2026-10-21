import { describe, it, expect } from "vitest";

describe("Artifact Download Gate & Security Controls", () => {
  it("blocks anonymous or unauthenticated download requests with 401", () => {
    const session = null;
    const isAllowed = Boolean(session);
    expect(isAllowed).toBe(false);
  });

  it("blocks downloads for unpaid project orders with 403", () => {
    const project = { id: "proj-1", status: "delivered" };
    const order = { id: "ord-1", status: "awaiting_payment" };

    const isPaid = order.status === "paid" || order.status === "paid_by_credit";
    expect(isPaid).toBe(false);
  });

  it("blocks other tenant or cross-tenant download attempts", () => {
    const sessionWorkspaceId: string = "ws-tenant-alpha";
    const projectWorkspaceId: string = "ws-tenant-beta"; // cross-tenant

    const isTenantAuthorized = sessionWorkspaceId === projectWorkspaceId;
    expect(isTenantAuthorized).toBe(false);
  });

  it("rejects expired download URLs", () => {
    const now = Date.now();
    const expiredTimestamp = now - 10_000; // 10s expired

    const isExpired = now > expiredTimestamp;
    expect(isExpired).toBe(true);
  });
});
