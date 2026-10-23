export class StudioAuthError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "StudioAuthError";
    this.status = status;
    this.code = code;
  }
}

export interface StudioSession {
  user: { id: string };
  workspace: { id: string };
}

export interface StudioProject {
  id: string;
  workspaceId: string;
  status: string;
}

export interface StudioOrder {
  kind: string;
  status: string;
}

export interface AuthorizeStudioInput {
  session: StudioSession | null;
  project: StudioProject | null;
  orders: StudioOrder[];
  balanceCents: number;
}

export interface AuthorizeStudioResult {
  ok: boolean;
  status: number;
  error?: string;
  balanceCents?: number;
}

/**
 * Pure Studio authorization gate, evaluated in strict order:
 * 401 unauthenticated -> 404 project missing/cross-tenant ->
 * 403 no paid build order (or a refunded build order) ->
 * 409 project not delivered/delivered_partial -> ok.
 *
 * The route loads the project, orders, and balance through `withTenant` and
 * passes them in. This function performs no database access.
 */
export function authorizeStudio({
  session,
  project,
  orders,
  balanceCents,
}: AuthorizeStudioInput): AuthorizeStudioResult {
  // 1. 401: unauthenticated
  if (!session?.user?.id || !session.workspace?.id) {
    return {
      ok: false,
      status: 401,
      error: "Authentication required to access Studio.",
    };
  }

  // 2. 404: project missing, or owned by another workspace
  if (!project || project.workspaceId !== session.workspace.id) {
    return {
      ok: false,
      status: 404,
      error: "Project not found.",
    };
  }

  // 3. 403: a delivered project must have a paid build order that was not refunded
  const buildOrders = (Array.isArray(orders) ? orders : []).filter(
    (order) => order.kind === "build"
  );
  if (buildOrders.some((order) => order.status === "refunded")) {
    return {
      ok: false,
      status: 403,
      error: "Studio access is locked because the build order was refunded.",
    };
  }
  const hasPaidBuildOrder = buildOrders.some(
    (order) => order.status === "paid" || order.status === "paid_by_credit"
  );
  if (!hasPaidBuildOrder) {
    return {
      ok: false,
      status: 403,
      error: "Studio requires a paid build order.",
    };
  }

  // 4. 409: project must be delivered
  if (project.status !== "delivered" && project.status !== "delivered_partial") {
    return {
      ok: false,
      status: 409,
      error: `Studio editor requires project to be delivered or delivered_partial. Current status: ${project.status}`,
    };
  }

  return {
    ok: true,
    status: 200,
    balanceCents: Number.isFinite(balanceCents) ? balanceCents : 0,
  };
}
