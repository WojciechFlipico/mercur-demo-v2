import { MedusaService } from "@medusajs/framework/utils"
import { Invoice } from "./models"

class InvoiceModuleService extends MedusaService({
  Invoice,
}) {}

export default InvoiceModuleService
