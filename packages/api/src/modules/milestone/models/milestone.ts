import { model } from "@medusajs/framework/utils"

export const MilestoneStatus = {
  PENDING: "pending",
  DUE: "due",
  PAID: "paid",
  CANCELLED: "cancelled",
} as const

export type MilestoneStatusType = (typeof MilestoneStatus)[keyof typeof MilestoneStatus]

const PaymentMilestone = model.define("payment_milestone", {
  id: model.id({ prefix: "pms" }).primaryKey(),
  // Each milestone is tied to a single invoice
  invoice_id: model.text(),
  // Order is also useful for filtering/reporting from the order side
  order_id: model.text().nullable(),
  // Display name, e.g. "Deposit", "Mid-project", "Final payment"
  label: model.text(),
  // Position in the schedule (0 = first)
  sequence: model.number().default(0),
  // Percentage of the invoice total (0-100). Sum of milestones for an invoice should be 100
  percentage: model.number(),
  amount: model.bigNumber(),
  currency_code: model.text().default("usd"),
  due_at: model.dateTime().nullable(),
  status: model.enum(MilestoneStatus).default(MilestoneStatus.PENDING),
  paid_at: model.dateTime().nullable(),
  notes: model.text().nullable(),
})

export default PaymentMilestone
