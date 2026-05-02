import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { NOTIFICATION_MODULE } from "../../../modules/notification"
import { NotifRecipient } from "../../../modules/notification/models"
import type NotificationModuleService from "../../../modules/notification/service"
import { getCustomerId } from "../buyer-orgs/_auth"

/**
 * GET /store/notifications
 * Returns the most recent notifications for the authenticated buyer.
 * Optional ?unread_only=true to filter.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Customer auth required")
  }
  const svc: NotificationModuleService = req.scope.resolve(NOTIFICATION_MODULE)
  const filters: Record<string, unknown> = {
    recipient_type: NotifRecipient.CUSTOMER,
    recipient_id: customerId,
  }
  if (req.query.unread_only === "true") {
    filters.read_at = null
  }
  const items = await svc.listNotifications(filters, {
    order: { created_at: "DESC" },
    take: Math.min(Number(req.query.limit ?? 50), 200),
  })
  const unread = items.filter((i: any) => !i.read_at).length
  res.json({ notifications: items, count: items.length, unread })
}
