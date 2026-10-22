import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

describe("Health API Route Integration Suite", () => {
  it("conforms strictly to the health endpoint JSON contract", async () => {
    const response = await GET();
    const data = await response.json();

    // Valid status values
    expect(["healthy", "degraded", "down"]).toContain(data.status);

    // Status code corresponds to status
    if (data.status === "healthy") {
      expect(response.status).toBe(200);
    } else {
      expect(response.status).toBe(503);
    }

    // Required services keys
    expect(data.services).toBeDefined();
    expect(typeof data.services.postgres).toBe("boolean");
    expect(typeof data.services.postgresSystem).toBe("boolean");
    expect(typeof data.services.redis).toBe("boolean");
    expect(typeof data.services.s3).toBe("boolean");
    expect(typeof data.services.docker).toBe("boolean");
    expect(typeof data.services.worker).toBe("boolean");

    // Timestamp
    expect(data.timestamp).toBeDefined();
    expect(new Date(data.timestamp).toString()).not.toBe("Invalid Date");
  });
});
