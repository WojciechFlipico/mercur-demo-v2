import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { QUOTE_MODULE } from "../../../../../modules/quote"
import { QuoteStatus } from "../../../../../modules/quote/models"
import { INVOICE_MODULE } from "../../../../../modules/invoice"
import { InvoiceStatus } from "../../../../../modules/invoice/models"
import { MILESTONE_MODULE } from "../../../../../modules/milestone"
import { MilestoneStatus } from "../../../../../modules/milestone/models"
import type QuoteModuleService from "../../../../../modules/quote/service"
import type InvoiceModuleService from "../../../../../modules/invoice/service"
import type MilestoneModuleService from "../../../../../modules/milestone/service"

type AcceptQuoteBody = {
  // Optional milestone schedule. Defaults to 30/70 split (deposit / final).
  milestones?: Array<{ label: string; percentage: number; due_at?: string }>
}

/**
 * POST /store/quotes/:id/accept
 * Buyer accepts a seller-quoted RFQ.
 * - Marks quote as accepted
 * - Creates an Invoice
 * - Creates payment milestones (default 30/70)
 *
 * Note: in a fuller build this would also create a real Medusa Order via
 * createOrderWorkflow. For MVP we generate an Invoice directly from the quote.
 */
export async function POST(
  req: MedusaRequest<AcceptQuoteBody>,
  res: MedusaResponse
) {
  const id = req.params.id
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const quoteService: QuoteModuleService = req.scope.resolve(QUOTE_MODULE)
  const invoiceService: InvoiceModuleService = req.scope.resolve(INVOICE_MODULE)
  const milestoneService: MilestoneModuleService =
    req.scope.resolve(MILESTONE_MODULE)

  const [quote] = await quoteService.listQuotes(
    { id },
    { relations: ["items"] }
  )
  if (!quote) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Quote ${id} not found`)
  }
  if (quote.status !== QuoteStatus.QUOTED) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Quote must be in 'quoted' state to be accepted (current: ${quote.status})`
    )
  }
  if (!quote.total_amount) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Quote has no total_amount; seller has not responded yet"
    )
  }

  const acceptedAt = new Date()

  // 1) Mark quote as accepted
  await quoteService.updateQuotes({
    selector: { id: quote.id },
    data: {
      status: QuoteStatus.ACCEPTED,
      accepted_at: acceptedAt,
    },
  })

  // 2) Create invoice
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
  const totalAmount = Number(quote.total_amount)
  const [invoice] = await invoiceService.createInvoices([
    {
      invoice_number: invoiceNumber,
      seller_id: quote.seller_id,
      buyer_email: quote.buyer_email,
      buyer_name: quote.buyer_name,
      buyer_company: quote.buyer_company,
      amount_due: totalAmount,
      currency_code: quote.currency_code,
      status: InvoiceStatus.SENT,
      issued_at: acceptedAt,
      // 30 days net by default
      due_at: new Date(acceptedAt.getTime() + 30 * 24 * 60 * 60 * 1000),
      notes: `Auto-generated from quote ${quote.id}`,
    },
  ])

  // 3) Create payment milestones (default: 30% deposit / 70% final)
  const schedule =
    req.body?.milestones && req.body.milestones.length > 0
      ? req.body.milestones
      : [
          { label: "Deposit", percentage: 30 },
          { label: "Final payment", percentage: 70 },
        ]
  const totalPct = schedule.reduce((s, m) => s + m.percentage, 0)
  if (totalPct !== 100) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Milestone percentages must sum to 100 (got ${totalPct})`
    )
  }
  const milestonesData = schedule.map((m, i) => ({
    invoice_id: invoice.id,
    label: m.label,
    sequence: i,
    percentage: m.percentage,
    amount: (totalAmount * m.percentage) / 100,
    currency_code: quote.currency_code,
    due_at: m.due_at ? new Date(m.due_at) : null,
    status: i === 0 ? MilestoneStatus.DUE : MilestoneStatus.PENDING,
  }))
  const milestones = await milestoneService.createPaymentMilestones(milestonesData)

  logger.info(
    `Quote ${quote.id} accepted → invoice ${invoice.id} (${invoiceNumber}) with ${milestones.length} milestones`
  )

  res.status(201).json({
    quote_id: quote.id,
    invoice,
    milestones,
  })
}
