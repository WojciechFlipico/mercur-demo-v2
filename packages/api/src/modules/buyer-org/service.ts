import { MedusaService } from "@medusajs/framework/utils"
import { BuyerOrg, BuyerMember } from "./models"

class BuyerOrgModuleService extends MedusaService({
  BuyerOrg,
  BuyerMember,
}) {}

export default BuyerOrgModuleService
