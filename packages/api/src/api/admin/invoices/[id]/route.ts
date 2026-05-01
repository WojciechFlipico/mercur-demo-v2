import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { INVOICE_MODULE } from "../../../../modules/invoice"
import { MILESTONE_MODULE } from "../../../../modules/milestone"
import type InvoiceModuleService from "../../../../modules/invoice/service"
import type MilestoneModuleService from "../../../../modules/milestone/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id
  const invoiceService: InvoiceModuleService = req.scope.resolve(INVOICE_MODULE)
  const milestoneService: MilestoneModuleService =
    req.scope.resolve(MILESTONE_MODULE)

  const [invoice] = await invoiceService.listInvoices({ id })
  if (!invoice) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Invoice ${id} not found`)
  }
  const milestones = await milestoneService.listPaymentMilestones(
    { invoice_id: id },
    { order: { sequence: "ASC" } }
  )
  res.json({ invoice: { ...invoice, milestones } })
}
