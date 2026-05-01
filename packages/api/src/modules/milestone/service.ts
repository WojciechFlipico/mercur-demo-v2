import { MedusaService } from "@medusajs/framework/utils"
import { PaymentMilestone } from "./models"

class MilestoneModuleService extends MedusaService({
  PaymentMilestone,
}) {}

export default MilestoneModuleService
