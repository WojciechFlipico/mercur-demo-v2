import type { MedusaRequest } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"

/**
 * Extract the authenticated buyer (customer) id from the request.
 * Looks first at the Medusa auth_context (populated by store auth middleware),
 * then falls back to manually decoding the Authorization Bearer JWT — useful
 * for routes registered outside of /store/customers default protected paths.
 *
 * Returns null when the caller is not authenticated as a customer.
 */
export function getCustomerId(req: MedusaRequest): string | null {
  // Path 1: middleware-populated context
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = (req as any).auth_context
  if (ctx?.actor_type === "customer" && ctx.actor_id) {
    return ctx.actor_id as string
  }
  // Path 2: manual decode (no signature verification — demo only).
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    const payload = jwt.decode(auth.slice("Bearer ".length)) as
      | { actor_id?: string; actor_type?: string; app_metadata?: { user_id?: string } }
      | null
    if (payload?.actor_type === "customer" && payload.actor_id) {
      return payload.actor_id
    }
  } catch {
    /* ignore */
  }
  return null
}
