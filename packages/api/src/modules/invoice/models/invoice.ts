import { model } from "@medusajs/framework/utils"

export const InvoiceStatus = {
  DRAFT: "draft",
  SENT: "sent",
  PAID: "paid",
  OVERDUE: "overdue",
  CANCELLED: "cancelled",
} as const

export type InvoiceStatusType = (typeof InvoiceStatus)[keyof typeof InvoiceStatus]

const Invoice = model.define("invoice", {
  id: model.id({ prefix: "inv" }).primaryKey(),
  // Human-readable invoice number (e.g. INV-2026-0001)
  invoice_number: model.text().unique(),
  // The Medusa order this invoice was created against
  order_id: model.text().nullable(),
  // The seller who issued this invoice
  seller_id: model.text().nullable(),
  // Buyer info (for the case where buyer is not yet a registered customer)
  buyer_email: model.text(),
  buyer_name: model.text().nullable(),
  buyer_company: model.text().nullable(),
  // Amounts
  amount_due: model.bigNumber(),
  amount_paid: model.bigNumber().default(0),
  currency_code: model.text().default("usd"),
  // Status / timing
  status: model.enum(InvoiceStatus).default(InvoiceStatus.DRAFT),
  issued_at: model.dateTime().nullable(),
  due_at: model.dateTime().nullable(),
  paid_at: model.dateTime().nullable(),
  notes: model.text().nullable(),
})

export default Invoice
