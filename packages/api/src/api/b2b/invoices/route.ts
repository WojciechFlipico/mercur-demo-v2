import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { INVOICE_MODULE } from "../../../modules/invoice"
import { MILESTONE_MODULE } from "../../../modules/milestone"
import type InvoiceModuleService from "../../../modules/invoice/service"
import type MilestoneModuleService from "../../../modules/milestone/service"

/**
 * GET /b2b/invoices
 * Seller lists their own invoices, with milestones inlined.
 * MVP-demo: seller identity passed via `x-seller-id` header.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const sellerId = (req.headers["x-seller-id"] as string) || undefined
  if (!sellerId) {
    return res.status(400).json({ message: "x-seller-id header is required" })
  }

  const invoiceService: InvoiceModuleService = req.scope.resolve(INVOICE_MODULE)
  const milestoneService: MilestoneModuleService =
    req.scope.resolve(MILESTONE_MODULE)

  const invoices = await invoiceService.listInvoices(
    { seller_id: sellerId },
    { order: { created_at: "DESC" } }
  )

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
