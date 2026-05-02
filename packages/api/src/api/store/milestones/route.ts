import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { MILESTONE_MODULE } from "../../../modules/milestone"
import { INVOICE_MODULE } from "../../../modules/invoice"
import { QUOTE_MODULE } from "../../../modules/quote"
import type MilestoneModuleService from "../../../modules/milestone/service"
import type InvoiceModuleService from "../../../modules/invoice/service"
import type QuoteModuleService from "../../../modules/quote/service"
import { getCustomerId } from "../buyer-orgs/_auth"

/**
 * GET /store/milestones?quote_id=... | invoice_id=...
 * Buyer-side milestone listing scoped by quote or invoice id.
 * Includes the parent invoice for context.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Customer auth required")
  }

  const milestoneService: MilestoneModuleService = req.scope.resolve(MILESTONE_MODULE)
  const invoiceService: InvoiceModuleService = req.scope.resolve(INVOICE_MODULE)
  const quoteService: QuoteModuleService = req.scope.resolve(QUOTE_MODULE)

  const quoteId = req.query.quote_id as string | undefined
  const invoiceId = req.query.invoice_id as string | undefined
  if (!quoteId && !invoiceId) {
    return res.status(400).json({ message: "quote_id or invoice_id query param is required" })
  }

  let invoice: any = null
  let quote: any = null
  if (invoiceId) {
    ;[invoice] = await invoiceService.listInvoices({ id: invoiceId })
    if (invoice?.order_id) {
      ;[quote] = await quoteService.listQuotes({ order_id: invoice.order_id })
    }
  } else if (quoteId) {
    ;[quote] = await quoteService.listQuotes({ id: quoteId })
    if (quote?.order_id) {
      ;[invoice] = await invoiceService.listInvoices({ order_id: quote.order_id })
    }
  }

  if (!invoice || !quote) {
    return res.json({ invoice: null, milestones: [] })
  }
  if (quote.requested_by_customer_id !== customerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "You can only view milestones for your own quotes"
    )
  }

  const milestones = await milestoneService.listPaymentMilestones(
    { invoice_id: invoice.id },
    { order: { sequence: "ASC" } }
  )
  res.json({ invoice, milestones })
}
