import type { MedusaRequest } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"
import { AUDIT_MODULE } from "../modules/audit"
import { AuditActorType } from "../modules/audit/models"
import type AuditModuleService from "../modules/audit/service"

type ActorInfo = {
  actor_type: keyof typeof AuditActorType extends infer K
    ? K extends string
      ? (typeof AuditActorType)[K & keyof typeof AuditActorType]
      : never
    : never
  actor_id: string | null
  actor_label: string | null
}

/**
 * Extracts the best-effort actor identity from the incoming request, using:
 *  1. req.auth_context (populated by Medusa's auth middleware)
 *  2. fallback decoded Authorization Bearer JWT
 *  3. x-seller-id header (for our /b2b/* MVP endpoints)
 * Falls back to "anonymous" or whatever override the caller provides.
 */
export function detectActor(req: MedusaRequest, overrides?: Partial<ActorInfo>): ActorInfo {
  const x = (req as any).auth_context as
    | { actor_id?: string; actor_type?: string }
    | undefined
  if (x?.actor_id && x.actor_type) {
    return {
      actor_type:
        (x.actor_type as ActorInfo["actor_type"]) ?? AuditActorType.ANONYMOUS,
      actor_id: x.actor_id,
      actor_label: null,
      ...overrides,
    }
  }

  // Manual JWT decode (no signature verification — demo purposes).
  const auth = req.headers.authorization
  if (auth?.startsWith("Bearer ")) {
    try {
      const payload = jwt.decode(auth.slice("Bearer ".length)) as
        | { actor_id?: string; actor_type?: string }
        | null
      if (payload?.actor_id && payload.actor_type) {
        return {
          actor_type:
            (payload.actor_type as ActorInfo["actor_type"]) ??
            AuditActorType.ANONYMOUS,
          actor_id: payload.actor_id,
          actor_label: null,
          ...overrides,
        }
      }
    } catch {
      /* ignore */
    }
  }

  // Fallback: vendor MVP shortcut header
  const sellerId = req.headers["x-seller-id"]
  if (typeof sellerId === "string" && sellerId) {
    return {
      actor_type: AuditActorType.SELLER,
      actor_id: sellerId,
      actor_label: null,
      ...overrides,
    }
  }

  return {
    actor_type: AuditActorType.ANONYMOUS,
    actor_id: null,
    actor_label: null,
    ...overrides,
  }
}

/**
 * Record an audit entry. Best-effort: errors are swallowed so user-facing
 * actions never fail because of a missing log.
 */
export async function recordAudit(
  req: MedusaRequest,
  data: {
    action: string
    resource_type: string
    resource_id: string
    payload?: Record<string, unknown>
    actor?: Partial<ActorInfo>
  }
) {
  try {
    const audit: AuditModuleService = req.scope.resolve(AUDIT_MODULE)
    const actor = detectActor(req, data.actor)
    await audit.createAuditEntries([
      {
        action: data.action,
        resource_type: data.resource_type,
        resource_id: data.resource_id,
        payload: data.payload ?? null,
        ...actor,
      },
    ])
  } catch {
    /* never block the main flow on audit write failure */
  }
}
