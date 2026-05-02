import { MedusaService } from "@medusajs/framework/utils"
import { Notification } from "./models"

class NotificationModuleService extends MedusaService({
  Notification,
}) {}

export default NotificationModuleService
