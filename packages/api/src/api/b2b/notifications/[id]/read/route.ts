import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NOTIFICATION_MODULE } from "../../../../../modules/notification"
import { NotifRecipient } from "../../../../../modules/notification/models"
import type NotificationModuleService from "../../../../../modules/notification/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const sellerId = (req.headers["x-seller-id"] as string) || undefined
  if (!sellerId) {
    return res.status(400).json({ message: "x-seller-id header is required" })
  }
  const svc: NotificationModuleService = req.scope.resolve(NOTIFICATION_MODULE)
  await svc.updateNotifications({
    selector: {
      id: req.params.id,
      recipient_type: NotifRecipient.SELLER,
      recipient_id: sellerId,
    },
    data: { read_at: new Date() },
  })
  res.json({ id: req.params.id, read: true })
}
