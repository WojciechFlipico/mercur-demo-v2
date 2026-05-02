// Shared helper: mark a milestone as paid + cascade invoice + promote next due.
// Called from both the manual seller "Mark paid" endpoint and the Stripe webhook.

import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { MILESTONE_MODULE } from "../modules/milestone"
import { MilestoneStatus } from "../modules/milestone/models"
import { INVOICE_MODULE } from "../modules/invoice"
import { InvoiceStatus } from "../modules/invoice/models"
import { QUOTE_MODULE } from "../modules/quote"
import type MilestoneModuleService from "../modules/milestone/service"
import type InvoiceModuleService from "../modules/invoice/service"
import type QuoteModuleService from "../modules/quote/service"
import { notify } from "./notification"
import { NotifRecipient } from "../modules/notification/models"

export type MarkPaidResult = {
  alreadyPaid?: boolean
  milestone: any
  invoiceFullyPaid?: boolean
  notes?: string
}

export async function markMilestonePaid(
  container: MedusaContainer,
  milestoneId: string,
  context: { source: "manual" | "stripe"; payment_intent_id?: string } = { source: "manual" }
): Promise<MarkPaidResult | null> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const milestoneService: MilestoneModuleService = container.resolve(MILESTONE_MODULE)
  const invoiceService: InvoiceModuleService = container.resolve(INVOICE_MODULE)
  const quoteService: QuoteModuleService = container.resolve(QUOTE_MODULE)

  const [milestone] = await milestoneService.listPaymentMilestones({ id: milestoneId })
  if (!milestone) return null

  if (milestone.status === MilestoneStatus.PAID) {
    return { alreadyPaid: true, milestone }
  }

  const paidAt = new Date()
  await milestoneService.updatePaymentMilestones({
    selector: { id: milestone.id },
    data: { status: MilestoneStatus.PAID, paid_at: paidAt },
  })

  let invoiceFullyPaid = false
  const [invoice] = await invoiceService.listInvoices({ id: milestone.invoice_id })
  if (invoice) {
    const newPaid = Number(invoice.amount_paid) + Number(milestone.amount)
    invoiceFullyPaid = newPaid >= Number(invoice.amount_due)
    await invoiceService.updateInvoices({
      selector: { id: invoice.id },
      data: {
        amount_paid: newPaid,
        status: invoiceFullyPaid ? InvoiceStatus.PAID : invoice.status,
        paid_at: invoiceFullyPaid ? paidAt : null,
      },
    })

    // Promote next pending milestone to 'due'
    const allMs = await milestoneService.listPaymentMilestones(
      { invoice_id: invoice.id },
      { order: { sequence: "ASC" } }
    )
    const next = allMs.find((m: any) => m.status === MilestoneStatus.PENDING)
    if (next) {
      await milestoneService.updatePaymentMilestones({
        selector: { id: next.id },
        data: { status: MilestoneStatus.DUE },
      })
    }

    // Notify buyer (best-effort, by going through quote.order_id)
    try {
      const [q] = invoice.order_id
        ? await quoteService.listQuotes({ order_id: invoice.order_id })
        : []
      if (q?.requested_by_customer_id) {
        await notify(container, {
          recipient_type: NotifRecipient.CUSTOMER,
          recipient_id: q.requested_by_customer_id,
          kind: "milestone.paid",
          title: `${milestone.label} paid`,
          body: `${milestone.amount} ${milestone.currency_code.toUpperCase()} confirmed (${context.source}).`,
          link: `/rfq/${q.id}`,
          payload: { milestone_id: milestone.id, invoice_id: milestone.invoice_id },
        })
      }
    } catch {
      /* never block on notification */
    }
  }

  logger.info(
    `Milestone ${milestone.id} marked paid via ${context.source}${context.payment_intent_id ? ` (${context.payment_intent_id})` : ""}: ${milestone.amount} ${milestone.currency_code}`
  )

  return { milestone: { ...milestone, status: MilestoneStatus.PAID, paid_at: paidAt }, invoiceFullyPaid }
}
