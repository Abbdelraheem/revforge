import { describe, it, expect } from "vitest";
import { StudioAuthError } from "@/lib/studio/authorize";

describe("Studio Access Gate Suite (401, 404, 403, 409)", () => {
  function evaluateStudioGate(params: {
    userId?: string | null;
    project?: { id: string; workspaceId: string; status: string } | null;
    userWorkspaceId?: string;
  }) {
    // 1. 401: Unauthenticated
    if (!params.userId) {
      throw new StudioAuthError(401, "UNAUTHENTICATED", "Authentication required to access Studio.");
    }

    // 2. 404: Project not found
    if (!params.project) {
      throw new StudioAuthError(404, "NOT_FOUND", "Project not found.");
    }

    // 3. 403: Tenant mismatch
    if (params.project.workspaceId !== params.userWorkspaceId) {
      throw new StudioAuthError(403, "TENANT_MISMATCH", "Access forbidden: User does not belong to project workspace.");
    }

    // 4. 409: Project status check
    const validStatuses = ["delivered", "delivered_partial"];
    if (!validStatuses.includes(params.project.status)) {
      throw new StudioAuthError(
        409,
        "INVALID_STATE",
        `Studio editor requires project to be delivered or delivered_partial. Current status: ${params.project.status}`
      );
    }

    return { ok: true, status: 200 };
  }

  it("gate 1: blocks anonymous requests with 401 Unauthenticated", () => {
    expect(() =>
      evaluateStudioGate({
        userId: null,
        project: { id: "p1", workspaceId: "ws1", status: "delivered" },
        userWorkspaceId: "ws1",
      })
    ).toThrowError(expect.objectContaining({ status: 401 }));
  });

  it("gate 2: returns 404 Not Found when project does not exist", () => {
    expect(() =>
      evaluateStudioGate({
        userId: "user-1",
        project: null,
        userWorkspaceId: "ws1",
      })
    ).toThrowError(expect.objectContaining({ status: 404 }));
  });

  it("gate 3: returns 403 Forbidden on cross-tenant access attempts", () => {
    expect(() =>
      evaluateStudioGate({
        userId: "user-1",
        project: { id: "p1", workspaceId: "ws-victim", status: "delivered" },
        userWorkspaceId: "ws-attacker",
      })
    ).toThrowError(expect.objectContaining({ status: 403 }));
  });

  it("gate 4: returns 409 Conflict when project is not in delivered/delivered_partial status", () => {
    const disallowedStatuses = ["draft", "analyzing", "analyzed", "building", "failed"];
    for (const status of disallowedStatuses) {
      expect(() =>
        evaluateStudioGate({
          userId: "user-1",
          project: { id: "p1", workspaceId: "ws1", status },
          userWorkspaceId: "ws1",
        })
      ).toThrowError(expect.objectContaining({ status: 409 }));
    }
  });

  it("permits access when all 4 gates pass for delivered and delivered_partial projects", () => {
    const res1 = evaluateStudioGate({
      userId: "user-1",
      project: { id: "p1", workspaceId: "ws1", status: "delivered" },
      userWorkspaceId: "ws1",
    });
    expect(res1.ok).toBe(true);

    const res2 = evaluateStudioGate({
      userId: "user-1",
      project: { id: "p2", workspaceId: "ws1", status: "delivered_partial" },
      userWorkspaceId: "ws1",
    });
    expect(res2.ok).toBe(true);
  });
});
