import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { INVOICE_MODULE } from "../../../modules/invoice"
import { MILESTONE_MODULE } from "../../../modules/milestone"
import type InvoiceModuleService from "../../../modules/invoice/service"
import type MilestoneModuleService from "../../../modules/milestone/service"

/**
 * GET /admin/invoices
 * Admin lists all invoices in the marketplace.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const invoiceService: InvoiceModuleService = req.scope.resolve(INVOICE_MODULE)
  const milestoneService: MilestoneModuleService =
    req.scope.resolve(MILESTONE_MODULE)

  const invoices = await invoiceService.listInvoices(
    {},
    { order: { created_at: "DESC" } }
  )

  // Attach milestones (cheap N+1 for MVP; would batch in production)
  const enriched = await Promise.all(
    invoices.map(async (inv) => {
      const milestones = await milestoneService.listPaymentMilestones(
        { invoice_id: inv.id },
        { order: { sequence: "ASC" } }
      )
      return { ...inv, milestones }
    })
  )

  res.json({ invoices: enriched, count: enriched.length })
}
