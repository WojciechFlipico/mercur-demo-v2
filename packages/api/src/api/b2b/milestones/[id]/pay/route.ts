import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { MILESTONE_MODULE } from "../../../../../modules/milestone"
import { MilestoneStatus } from "../../../../../modules/milestone/models"
import { INVOICE_MODULE } from "../../../../../modules/invoice"
import { InvoiceStatus } from "../../../../../modules/invoice/models"
import type MilestoneModuleService from "../../../../../modules/milestone/service"
import type InvoiceModuleService from "../../../../../modules/invoice/service"
import { recordAudit } from "../../../../../lib/audit"
import { notify } from "../../../../../lib/notification"
import { NotifRecipient } from "../../../../../modules/notification/models"
import { QUOTE_MODULE } from "../../../../../modules/quote"
import type QuoteModuleService from "../../../../../modules/quote/service"

/**
 * POST /vendor/milestones/:id/pay
 * Marks a milestone as paid.
 * - Sets milestone.status=paid, paid_at=now
 * - Updates invoice.amount_paid (+= milestone.amount)
 * - Promotes the next pending milestone to 'due'
 * - If all paid, marks invoice as 'paid'
 *
 * In a real flow this would be triggered by a Stripe webhook on capture success;
 * for the MVP demo it's a manual action so we can show the full state machine.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const milestoneService: MilestoneModuleService =
    req.scope.resolve(MILESTONE_MODULE)
  const invoiceService: InvoiceModuleService = req.scope.resolve(INVOICE_MODULE)

  const [milestone] = await milestoneService.listPaymentMilestones({ id })
  if (!milestone) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Milestone ${id} not found`
    )
  }
  if (milestone.status === MilestoneStatus.PAID) {
    return res.json({ milestone, message: "Already paid" })
  }

  const paidAt = new Date()
  await milestoneService.updatePaymentMilestones({
    selector: { id: milestone.id },
    data: { status: MilestoneStatus.PAID, paid_at: paidAt },
  })

  // Update invoice's running paid amount
  const [invoice] = await invoiceService.listInvoices({
    id: milestone.invoice_id,
  })
  if (invoice) {
    const newPaid = Number(invoice.amount_paid) + Number(milestone.amount)
    const fullyPaid = newPaid >= Number(invoice.amount_due)
    await invoiceService.updateInvoices({
      selector: { id: invoice.id },
      data: {
        amount_paid: newPaid,
        status: fullyPaid ? InvoiceStatus.PAID : invoice.status,
        paid_at: fullyPaid ? paidAt : null,
      },
    })

    // Promote the next pending milestone to 'due'
    const allMilestones = await milestoneService.listPaymentMilestones(
      { invoice_id: invoice.id },
      { order: { sequence: "ASC" } }
    )
    const nextPending = allMilestones.find(
      (m) => m.status === MilestoneStatus.PENDING
    )
    if (nextPending) {
      await milestoneService.updatePaymentMilestones({
        selector: { id: nextPending.id },
        data: { status: MilestoneStatus.DUE },
      })
    }
  }

  logger.info(
    `Milestone ${milestone.id} marked paid (${milestone.amount} ${milestone.currency_code})`
  )

  await recordAudit(req, {
    action: "milestone.paid",
    resource_type: "milestone",
    resource_id: milestone.id,
    payload: {
      label: milestone.label,
      amount: Number(milestone.amount),
      currency_code: milestone.currency_code,
      invoice_id: milestone.invoice_id,
    },
  })

  // Notify the buyer who requested the originating quote (best-effort lookup).
  try {
    const quoteService: QuoteModuleService = req.scope.resolve(QUOTE_MODULE)
    const [q] = invoice
      ? await quoteService.listQuotes({ order_id: invoice.order_id })
      : []
    if (q?.requested_by_customer_id) {
      await notify(req.scope as any, {
        recipient_type: NotifRecipient.CUSTOMER,
        recipient_id: q.requested_by_customer_id,
        kind: "milestone.paid",
        title: `${milestone.label} paid`,
        body: `${milestone.amount} ${milestone.currency_code.toUpperCase()} confirmed paid for invoice.`,
        link: `/rfq/${q.id}`,
        payload: { milestone_id: milestone.id, invoice_id: milestone.invoice_id },
      })
    }
  } catch {
    /* never block on notification */
  }

  const [updatedMilestone] = await milestoneService.listPaymentMilestones({ id })
  res.json({ milestone: updatedMilestone })
}
