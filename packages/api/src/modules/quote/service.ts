import { MedusaService } from "@medusajs/framework/utils"
import { Quote, QuoteItem } from "./models"

class QuoteModuleService extends MedusaService({
  Quote,
  QuoteItem,
}) {}

export default QuoteModuleService
