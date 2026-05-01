import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { QUOTE_MODULE } from "../../../../../modules/quote"
import { ApprovalStatus, QuoteStatus } from "../../../../../modules/quote/models"
import { INVOICE_MODULE } from "../../../../../modules/invoice"
import { InvoiceStatus } from "../../../../../modules/invoice/models"
import { MILESTONE_MODULE } from "../../../../../modules/milestone"
import { MilestoneStatus } from "../../../../../modules/milestone/models"
import { BUYER_ORG_MODULE } from "../../../../../modules/buyer-org"
import { BuyerRole } from "../../../../../modules/buyer-org/models"
import type QuoteModuleService from "../../../../../modules/quote/service"
import type InvoiceModuleService from "../../../../../modules/invoice/service"
import type MilestoneModuleService from "../../../../../modules/milestone/service"
import type BuyerOrgModuleService from "../../../../../modules/buyer-org/service"
import { getCustomerId } from "../../../buyer-orgs/_auth"

type AcceptQuoteBody = {
  milestones?: Array<{ label: string; percentage: number; due_at?: string }>
}

/**
 * Materialize an accepted quote into an invoice + milestones.
 * Shared by the direct-accept path and the approval path.
 */
async function materializeAcceptance(
  scope: MedusaRequest["scope"],
  quote: any,
  schedule: NonNullable<AcceptQuoteBody["milestones"]>,
  acceptedAt: Date,
  logger: { info: (m: string) => void }
) {
  const invoiceService: InvoiceModuleService = scope.resolve(INVOICE_MODULE)
  const milestoneService: MilestoneModuleService = scope.resolve(MILESTONE_MODULE)
  const quoteService: QuoteModuleService = scope.resolve(QUOTE_MODULE)

  await quoteService.updateQuotes({
    selector: { id: quote.id },
    data: {
      status: QuoteStatus.ACCEPTED,
      accepted_at: acceptedAt,
    },
  })

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
      due_at: new Date(acceptedAt.getTime() + 30 * 24 * 60 * 60 * 1000),
      notes: `Auto-generated from quote ${quote.id}`,
    },
  ])

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

  return { invoice, milestones }
}

/**
 * POST /store/quotes/:id/accept
 *
 * - Anonymous (no auth, no buyer_org_id on quote): accepts directly.
 * - Authenticated within a buyer_org: enforces approval rules.
 *   - If caller's effective limit covers the quote total → accept directly.
 *   - Otherwise → mark approval_status = pending, leave quote in 'quoted' state,
 *     do NOT create invoice yet. An admin/approver completes via /approve.
 */
export async function POST(
  req: MedusaRequest<AcceptQuoteBody>,
  res: MedusaResponse
) {
  const id = req.params.id
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const quoteService: QuoteModuleService = req.scope.resolve(QUOTE_MODULE)
  const orgService: BuyerOrgModuleService = req.scope.resolve(BUYER_ORG_MODULE)

  const [quote] = await quoteService.listQuotes({ id }, { relations: ["items"] })
  if (!quote) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Quote ${id} not found`)
  }
  if (quote.status !== QuoteStatus.QUOTED) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Quote must be in 'quoted' state (current: ${quote.status})`
    )
  }
  if (!quote.total_amount) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Quote has no total_amount yet"
    )
  }

  const schedule =
    req.body?.milestones && req.body.milestones.length > 0
      ? req.body.milestones
      : [
          { label: "Deposit", percentage: 30 },
          { label: "Final payment", percentage: 70 },
        ]
  const acceptedAt = new Date()

  // Approval logic only kicks in for org-bound quotes.
  if (quote.buyer_org_id) {
    const customerId = getCustomerId(req)
    if (!customerId) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "Authentication required for org-bound quote"
      )
    }
    const [org] = await orgService.listBuyerOrgs({ id: quote.buyer_org_id })
    const [member] = await orgService.listBuyerMembers({
      org_id: quote.buyer_org_id,
      customer_id: customerId,
    })
    if (!org || !member) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Caller is not a member of the buyer org"
      )
    }

    const total = Number(quote.total_amount)
    const orgThreshold =
      org.approval_threshold != null ? Number(org.approval_threshold) : null
    const memberLimit =
      member.approval_limit != null ? Number(member.approval_limit) : null

    // Effective limit for "can accept directly":
    //   admins always pass
    //   approvers pass when total <= memberLimit OR memberLimit is null and total <= orgThreshold (or threshold null)
    //   buyers pass only when total <= memberLimit, OR memberLimit null AND total <= orgThreshold (and threshold not null acting as cap)
    let canAcceptDirectly = false
    if (member.role === BuyerRole.ADMIN) {
      canAcceptDirectly = true
    } else if (memberLimit != null) {
      canAcceptDirectly = total <= memberLimit
    } else if (member.role === BuyerRole.APPROVER) {
      canAcceptDirectly = orgThreshold == null || total <= orgThreshold
    } else {
      // pure buyer with no personal limit: only auto-pass when below org threshold
      canAcceptDirectly = orgThreshold != null && total <= orgThreshold
    }

    if (!canAcceptDirectly) {
      // Send for approval — don't accept yet.
      await quoteService.updateQuotes({
        selector: { id: quote.id },
        data: {
          approval_status: ApprovalStatus.PENDING,
          approval_requested_at: acceptedAt,
        },
      })
      const [updated] = await quoteService.listQuotes(
        { id: quote.id },
        { relations: ["items"] }
      )
      logger.info(
        `Quote ${quote.id} sent for approval (total=${total}, member=${member.id} role=${member.role}, limit=${memberLimit ?? "n/a"}, threshold=${orgThreshold ?? "n/a"})`
      )
      return res.status(202).json({
        quote: updated,
        approval_required: true,
        message:
          "Quote total exceeds your approval limit; sent to org admin/approver.",
      })
    }
  }

  // Direct acceptance path.
  const { invoice, milestones } = await materializeAcceptance(
    req.scope,
    quote,
    schedule,
    acceptedAt,
    logger
  )

  // For org quotes, mark approval_status = approved (auto by direct accept).
  if (quote.buyer_org_id) {
    const customerId = getCustomerId(req)
    await quoteService.updateQuotes({
      selector: { id: quote.id },
      data: {
        approval_status: ApprovalStatus.APPROVED,
        approved_by_customer_id: customerId,
        approved_at: acceptedAt,
      },
    })
  }

  res.status(201).json({
    quote_id: quote.id,
    invoice,
    milestones,
    approval_required: false,
  })
}
