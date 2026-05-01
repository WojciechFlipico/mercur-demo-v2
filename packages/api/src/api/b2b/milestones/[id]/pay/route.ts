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

  const [updatedMilestone] = await milestoneService.listPaymentMilestones({ id })
  res.json({ milestone: updatedMilestone })
}
