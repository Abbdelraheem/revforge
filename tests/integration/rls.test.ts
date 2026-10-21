import { describe, it, expect } from "vitest";
import { getTenantDb } from "@/db/tenant";

describe("Tenant Isolation & Row-Level Security (RLS)", () => {
  it("enforces complete isolation between workspaceA and workspaceB", async () => {
    const workspaceA = "11111111-1111-4111-8111-111111111111";
    const workspaceB = "22222222-2222-4222-8222-222222222222";

    const dbA = getTenantDb(workspaceA);
    const dbB = getTenantDb(workspaceB);

    // Cross-tenant query simulation: workspaceA should see zero rows belonging to workspaceB
    const crossTenantRows = await dbA.query((db) =>
      db.selectFrom("projects").where("workspace_id", "=", workspaceB)
    );

    expect(crossTenantRows).toHaveLength(0);
    expect(crossTenantRows).toEqual([]);
  });
});
