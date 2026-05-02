import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NOTIFICATION_MODULE } from "../../../modules/notification"
import { NotifRecipient } from "../../../modules/notification/models"
import type NotificationModuleService from "../../../modules/notification/service"

/**
 * GET /b2b/notifications
 * Seller notifications. MVP: identity passed via x-seller-id header.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const sellerId = (req.headers["x-seller-id"] as string) || undefined
  if (!sellerId) {
    return res.status(400).json({ message: "x-seller-id header is required" })
  }
  const svc: NotificationModuleService = req.scope.resolve(NOTIFICATION_MODULE)
  const filters: Record<string, unknown> = {
    recipient_type: NotifRecipient.SELLER,
    recipient_id: sellerId,
  }
  if (req.query.unread_only === "true") filters.read_at = null
  const items = await svc.listNotifications(filters, {
    order: { created_at: "DESC" },
    take: Math.min(Number(req.query.limit ?? 50), 200),
  })
  const unread = items.filter((i: any) => !i.read_at).length
  res.json({ notifications: items, count: items.length, unread })
}
