import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AUDIT_MODULE } from "../../../modules/audit"
import type AuditModuleService from "../../../modules/audit/service"

/**
 * GET /admin/audit-logs
 * Admin view: chronological audit trail across the marketplace.
 * Optional filters: ?resource_type=quote&resource_id=...&action=quote.accepted
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const audit: AuditModuleService = req.scope.resolve(AUDIT_MODULE)
  const filters: Record<string, unknown> = {}
  if (req.query.resource_type) filters.resource_type = req.query.resource_type
  if (req.query.resource_id) filters.resource_id = req.query.resource_id
  if (req.query.action) filters.action = req.query.action
  if (req.query.actor_type) filters.actor_type = req.query.actor_type

  const limit = Math.min(Number(req.query.limit ?? 100), 500)
  const entries = await audit.listAuditEntries(filters, {
    order: { created_at: "DESC" },
    take: limit,
  })
  res.json({ entries, count: entries.length })
}
