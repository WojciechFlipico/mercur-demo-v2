import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { NOTIFICATION_MODULE } from "../../../../../modules/notification"
import { NotifRecipient } from "../../../../../modules/notification/models"
import type NotificationModuleService from "../../../../../modules/notification/service"
import { getCustomerId } from "../../../buyer-orgs/_auth"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Customer auth required")
  }
  const svc: NotificationModuleService = req.scope.resolve(NOTIFICATION_MODULE)
  await svc.updateNotifications({
    selector: {
      id: req.params.id,
      recipient_type: NotifRecipient.CUSTOMER,
      recipient_id: customerId,
    },
    data: { read_at: new Date() },
  })
  res.json({ id: req.params.id, read: true })
}
