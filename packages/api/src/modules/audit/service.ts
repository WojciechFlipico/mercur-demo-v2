import { MedusaService } from "@medusajs/framework/utils"
import { AuditEntry } from "./models"

class AuditModuleService extends MedusaService({
  AuditEntry,
}) {}

export default AuditModuleService
