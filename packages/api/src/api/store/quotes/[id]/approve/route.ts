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

type ApprovalBody = {
  decision: "approve" | "reject"
  note?: string
}

/**
 * POST /store/quotes/:id/approve
 * Admin/approver of the buyer org reviews a quote that was sent for approval.
 * On approve → quote is fully accepted: invoice + milestones generated.
 * On reject → approval_status = rejected (quote stays in 'quoted' state).
 */
export async function POST(req: MedusaRequest<ApprovalBody>, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Customer auth required")
  }
  const id = req.params.id
  const decision = req.body?.decision
  if (decision !== "approve" && decision !== "reject") {
    return res.status(400).json({ message: "decision must be 'approve' or 'reject'" })
  }

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const quoteService: QuoteModuleService = req.scope.resolve(QUOTE_MODULE)
  const orgService: BuyerOrgModuleService = req.scope.resolve(BUYER_ORG_MODULE)

  const [quote] = await quoteService.listQuotes({ id }, { relations: ["items"] })
  if (!quote) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Quote ${id} not found`)
  }
  if (!quote.buyer_org_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "This quote is not org-bound; no approval flow"
    )
  }
  if (quote.approval_status !== ApprovalStatus.PENDING) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Quote is not pending approval (current: ${quote.approval_status})`
    )
  }
  // Caller must be admin/approver of the org
  const [member] = await orgService.listBuyerMembers({
    org_id: quote.buyer_org_id,
    customer_id: customerId,
  })
  if (!member) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Not a member of buyer org")
  }
  if (member.role !== BuyerRole.ADMIN && member.role !== BuyerRole.APPROVER) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Only org admins/approvers can review approvals"
    )
  }

  const now = new Date()

  if (decision === "reject") {
    await quoteService.updateQuotes({
      selector: { id: quote.id },
      data: {
        approval_status: ApprovalStatus.REJECTED,
        approved_by_customer_id: customerId,
        approved_at: now,
        approval_note: req.body?.note ?? null,
      },
    })
    logger.info(`Quote ${quote.id} approval REJECTED by ${customerId}`)
    const [updated] = await quoteService.listQuotes(
      { id: quote.id },
      { relations: ["items"] }
    )
    return res.json({ quote: updated })
  }

  // Approve → materialize invoice + milestones (same logic as direct accept)
  const invoiceService: InvoiceModuleService = req.scope.resolve(INVOICE_MODULE)
  const milestoneService: MilestoneModuleService = req.scope.resolve(MILESTONE_MODULE)
  const totalAmount = Number(quote.total_amount)
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

  await quoteService.updateQuotes({
    selector: { id: quote.id },
    data: {
      status: QuoteStatus.ACCEPTED,
      accepted_at: now,
      approval_status: ApprovalStatus.APPROVED,
      approved_by_customer_id: customerId,
      approved_at: now,
      approval_note: req.body?.note ?? null,
    },
  })

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
      issued_at: now,
      due_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      notes: `Auto-generated from quote ${quote.id} (approved by ${customerId})`,
    },
  ])

  const milestones = await milestoneService.createPaymentMilestones([
    {
      invoice_id: invoice.id,
      label: "Deposit",
      sequence: 0,
      percentage: 30,
      amount: totalAmount * 0.3,
      currency_code: quote.currency_code,
      status: MilestoneStatus.DUE,
    },
    {
      invoice_id: invoice.id,
      label: "Final payment",
      sequence: 1,
      percentage: 70,
      amount: totalAmount * 0.7,
      currency_code: quote.currency_code,
      status: MilestoneStatus.PENDING,
    },
  ])

  logger.info(`Quote ${quote.id} approved by ${customerId} → invoice ${invoice.id}`)
  res.json({ quote_id: quote.id, invoice, milestones })
}

/**
 * GET /store/quotes/:id/approve
 * Lists pending approvals for the caller's org (helper for /approvals page).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Customer auth required")
  }
  const orgService: BuyerOrgModuleService = req.scope.resolve(BUYER_ORG_MODULE)
  const quoteService: QuoteModuleService = req.scope.resolve(QUOTE_MODULE)

  const [member] = await orgService.listBuyerMembers({ customer_id: customerId })
  if (!member) {
    return res.json({ quotes: [], count: 0 })
  }
  const pending = await quoteService.listQuotes(
    {
      buyer_org_id: member.org_id,
      approval_status: ApprovalStatus.PENDING,
    },
    { relations: ["items"], order: { created_at: "DESC" } }
  )
  res.json({ quotes: pending, count: pending.length })
}
