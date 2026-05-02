import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { MILESTONE_MODULE } from "../../../../../modules/milestone"
import { MilestoneStatus } from "../../../../../modules/milestone/models"
import { INVOICE_MODULE } from "../../../../../modules/invoice"
import { QUOTE_MODULE } from "../../../../../modules/quote"
import type MilestoneModuleService from "../../../../../modules/milestone/service"
import type InvoiceModuleService from "../../../../../modules/invoice/service"
import type QuoteModuleService from "../../../../../modules/quote/service"
import { getCustomerId } from "../../../buyer-orgs/_auth"
import { getStripe, isStripeConfigured } from "../../../../../lib/stripe"

/**
 * POST /store/milestones/:id/payment-intent
 * Buyer-side: creates a Stripe PaymentIntent for the milestone amount.
 * Returns client_secret + publishable_key for Stripe.js to confirm card payment.
 *
 * Webhook /hooks/stripe finalizes the milestone.paid state on payment_intent.succeeded.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!isStripeConfigured()) {
    return res.status(503).json({
      type: "stripe_not_configured",
      message:
        "Stripe is not configured on this environment. Set STRIPE_SECRET_API_KEY and NEXT_PUBLIC_STRIPE_KEY env vars to enable card payments.",
    })
  }

  const customerId = getCustomerId(req)
  if (!customerId) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Customer auth required")
  }

  const milestoneId = req.params.id
  const milestoneService: MilestoneModuleService = req.scope.resolve(MILESTONE_MODULE)
  const invoiceService: InvoiceModuleService = req.scope.resolve(INVOICE_MODULE)
  const quoteService: QuoteModuleService = req.scope.resolve(QUOTE_MODULE)

  const [milestone] = await milestoneService.listPaymentMilestones({ id: milestoneId })
  if (!milestone) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Milestone ${milestoneId} not found`)
  }
  if (milestone.status !== MilestoneStatus.DUE) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Milestone is not due (current: ${milestone.status})`
    )
  }

  // Verify the buyer owns the related quote
  const [invoice] = await invoiceService.listInvoices({ id: milestone.invoice_id })
  if (!invoice) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Invoice missing")
  }
  const [quote] = invoice.order_id
    ? await quoteService.listQuotes({ order_id: invoice.order_id })
    : []
  if (!quote) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Source quote missing")
  }
  if (quote.requested_by_customer_id !== customerId) {
    // Allow any member of the same buyer org to pay
    // (admins/approvers commonly handle invoicing on behalf of buyers).
    // For the MVP we only relax this if the customer is the requester.
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "You can only pay milestones for your own quotes"
    )
  }

  const stripe = getStripe()
  const amountMinor = Math.round(Number(milestone.amount) * 100)
  const intent = await stripe.paymentIntents.create({
    amount: amountMinor,
    currency: milestone.currency_code,
    automatic_payment_methods: { enabled: true },
    metadata: {
      milestone_id: milestone.id,
      invoice_id: invoice.id,
      quote_id: quote.id,
      customer_id: customerId,
    },
    description: `${milestone.label} for invoice ${invoice.invoice_number}`,
  })

  res.json({
    client_secret: intent.client_secret,
    publishable_key: process.env.NEXT_PUBLIC_STRIPE_KEY ?? null,
    payment_intent_id: intent.id,
    amount: amountMinor,
    currency: milestone.currency_code,
  })
}
