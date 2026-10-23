import { describe, expect, it } from "vitest";
import { authorizeDownload } from "@/lib/delivery/authorize";
import { isExpired, versionExpiresAt } from "@/lib/delivery/context";

const session = {
  user: { id: "user-1" },
  workspace: { id: "ws-1" },
};

const project = {
  id: "project-1",
  workspaceId: "ws-1",
  status: "delivered",
};

const paidBuild = {
  id: "order-1",
  kind: "build",
  status: "paid",
};

const delivery = {
  id: "delivery-1",
  storageKey: "deliveries/ws-1/project-1/job-1.zip",
  expiresAt: new Date(Date.now() + 60_000),
  createdAt: new Date(),
};

describe("delivery authorization", () => {
  it("returns 401 before any other state check", () => {
    expect(
      authorizeDownload({
        session: null,
        project: { ...project, workspaceId: "other" },
        orders: [],
        delivery: null,
      })
    ).toMatchObject({ ok: false, status: 401 });
  });

  it("hides a cross-tenant project behind 404", () => {
    expect(
      authorizeDownload({
        session,
        project: { ...project, workspaceId: "ws-2" },
        orders: [paidBuild],
        delivery,
      })
    ).toMatchObject({ ok: false, status: 404 });
  });

  it("requires a paid build order, not an analysis fee", () => {
    expect(
      authorizeDownload({
        session,
        project,
        orders: [{ id: "fee-1", kind: "analysis_fee", status: "paid" }],
        delivery,
      })
    ).toMatchObject({ ok: false, status: 403 });

    expect(
      authorizeDownload({
        session,
        project,
        orders: [paidBuild],
        delivery,
      })
    ).toMatchObject({ ok: true, status: 200 });
  });

  it("locks access when a build order was refunded", () => {
    expect(
      authorizeDownload({
        session,
        project,
        orders: [{ ...paidBuild, status: "refunded" }],
        delivery,
      })
    ).toMatchObject({ ok: false, status: 403 });
  });

  it("returns 409 while the project is not delivered", () => {
    expect(
      authorizeDownload({
        session,
        project: { ...project, status: "paid" },
        orders: [paidBuild],
        delivery,
      })
    ).toMatchObject({ ok: false, status: 409 });
  });

  it("returns delivery_missing rather than inventing a storage key", () => {
    expect(
      authorizeDownload({
        session,
        project,
        orders: [paidBuild],
        delivery: null,
      })
    ).toMatchObject({ ok: false, status: 404, error: "delivery_missing" });
  });

  it("returns 410 at and after the stored expiry instant", () => {
    const now = Date.now();
    const expired = {
      ...delivery,
      expiresAt: new Date(now),
    };

    expect(
      authorizeDownload({
        session,
        project,
        orders: [paidBuild],
        delivery: expired,
        now,
      })
    ).toMatchObject({ ok: false, status: 410 });

    expect(
      authorizeDownload({
        session,
        project,
        orders: [paidBuild],
        delivery: { ...expired, expiresAt: new Date(now - 1) },
        now,
      })
    ).toMatchObject({ ok: false, status: 410 });
  });

  it("returns exactly the stored storage key when all gates pass", () => {
    expect(
      authorizeDownload({
        session,
        project,
        orders: [paidBuild],
        delivery,
      })
    ).toEqual({
      ok: true,
      status: 200,
      storageKey: delivery.storageKey,
    });
  });

  it("computes version expiry from the configured retention days", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const expiresAt = versionExpiresAt({ createdAt }, 90);

    expect(expiresAt.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(isExpired(expiresAt, new Date("2026-03-31T23:59:59.999Z").getTime())).toBe(false);
    expect(isExpired(expiresAt, expiresAt.getTime())).toBe(true);
  });
});
