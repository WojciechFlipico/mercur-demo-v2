import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { MILESTONE_MODULE } from "../../../../../modules/milestone"
import { INVOICE_MODULE } from "../../../../../modules/invoice"
import { QUOTE_MODULE } from "../../../../../modules/quote"
import type MilestoneModuleService from "../../../../../modules/milestone/service"
import type InvoiceModuleService from "../../../../../modules/invoice/service"
import type QuoteModuleService from "../../../../../modules/quote/service"
import { getCustomerId } from "../../../buyer-orgs/_auth"
import { markMilestonePaid } from "../../../../../lib/milestone-pay"
import { recordAudit } from "../../../../../lib/audit"

/**
 * POST /store/milestones/:id/pay
 * Buyer-side mock-pay endpoint. Used when Stripe is not configured — flips the
 * milestone state without touching a real PSP. Production demos with live
 * Stripe keys should use /payment-intent + /hooks/stripe instead.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Customer auth required")
  }
  const milestoneId = req.params.id

  // Ownership check (same logic as PaymentIntent endpoint)
  const milestoneService: MilestoneModuleService = req.scope.resolve(MILESTONE_MODULE)
  const invoiceService: InvoiceModuleService = req.scope.resolve(INVOICE_MODULE)
  const quoteService: QuoteModuleService = req.scope.resolve(QUOTE_MODULE)
  const [milestone] = await milestoneService.listPaymentMilestones({ id: milestoneId })
  if (!milestone) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Milestone ${milestoneId} not found`)
  }
  const [invoice] = await invoiceService.listInvoices({ id: milestone.invoice_id })
  const [quote] = invoice?.order_id
    ? await quoteService.listQuotes({ order_id: invoice.order_id })
    : []
  if (!quote || quote.requested_by_customer_id !== customerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "You can only pay milestones for your own quotes"
    )
  }

  const result = await markMilestonePaid(req.scope as any, milestoneId, { source: "manual" })
  if (!result) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Milestone ${milestoneId} not found`)
  }
  await recordAudit(req, {
    action: "milestone.paid",
    resource_type: "milestone",
    resource_id: milestoneId,
    payload: { source: "manual_buyer", invoice_id: milestone.invoice_id },
  })
  return res.json({ milestone: result.milestone, invoice_fully_paid: result.invoiceFullyPaid })
}
