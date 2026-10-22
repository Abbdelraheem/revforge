export interface AuthorizeDownloadParams {
  session: {
    user: { id: string };
    workspace: { id: string };
  } | null;
  project: {
    id: string;
    workspaceId: string;
    status: string;
  } | null;
  orders: Array<{
    id: string;
    kind: string;
    status: string;
  }>;
  delivery: {
    id: string;
    storageKey: string;
    expiresAt?: Date | null;
    createdAt?: Date;
  } | null;
  now?: number;
}

export interface AuthorizeDownloadResult {
  ok: boolean;
  status: number;
  error?: string;
  storageKey?: string;
}

/**
 * Authorizes a project delivery download strictly in order:
 * 401 (no session) -> 404 (project missing or cross-tenant) ->
 * 403 (no paid build order / refunded) -> 409 (not delivered) ->
 * 404 delivery_missing (no delivery row, never fabricate) -> 410 (expired) ->
 * { ok: true, storageKey }
 */
export function authorizeDownload(
  params: AuthorizeDownloadParams
): AuthorizeDownloadResult {
  const now = params.now ?? Date.now();

  // 1. 401 (no session)
  if (!params.session) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  // 2. 404 (project missing or other workspace)
  if (!params.project || params.project.workspaceId !== params.session.workspace.id) {
    return { ok: false, status: 404, error: "Project not found or unauthorized access" };
  }

  // 3. 403 (no paid `build` order; a paid `analysis_fee` does not count; any refunded build order locks)
  const buildOrders = params.orders.filter((o) => o.kind === "build");
  const hasRefunded = buildOrders.some((o) => o.status === "refunded");
  if (hasRefunded) {
    return { ok: false, status: 403, error: "Access locked: build order has been refunded" };
  }

  const hasPaidBuildOrder = buildOrders.some(
    (o) => o.status === "paid" || o.status === "paid_by_credit"
  );
  if (!hasPaidBuildOrder) {
    return { ok: false, status: 403, error: "Requires a paid build order to download artifacts" };
  }

  // 4. 409 (project not `delivered`/`delivered_partial`)
  if (
    params.project.status !== "delivered" &&
    params.project.status !== "delivered_partial"
  ) {
    return {
      ok: false,
      status: 409,
      error: `Project status '${params.project.status}' is not delivered or delivered_partial`,
    };
  }

  // 5. 404 delivery_missing (no delivery row; never fabricate a key)
  if (!params.delivery || !params.delivery.storageKey) {
    return { ok: false, status: 404, error: "delivery_missing" };
  }

  // 6. 410 (expired)
  if (params.delivery.expiresAt) {
    const expTime = new Date(params.delivery.expiresAt).getTime();
    if (now > expTime) {
      return { ok: false, status: 410, error: "Delivery archive link has expired" };
    }
  }

  // 7. { ok: true, storageKey } exactly the stored key
  return {
    ok: true,
    status: 200,
    storageKey: params.delivery.storageKey,
  };
}
