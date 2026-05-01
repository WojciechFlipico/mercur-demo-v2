import { model } from "@medusajs/framework/utils"
import QuoteItem from "./quote-item"

export const QuoteStatus = {
  REQUESTED: "requested",
  QUOTED: "quoted",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  EXPIRED: "expired",
} as const

export type QuoteStatusType = (typeof QuoteStatus)[keyof typeof QuoteStatus]

export const ApprovalStatus = {
  NOT_REQUIRED: "not_required",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const

export type ApprovalStatusType = (typeof ApprovalStatus)[keyof typeof ApprovalStatus]

const Quote = model.define("quote", {
  id: model.id({ prefix: "qte" }).primaryKey(),
  buyer_email: model.text(),
  buyer_name: model.text().nullable(),
  buyer_company: model.text().nullable(),
  status: model.enum(QuoteStatus).default(QuoteStatus.REQUESTED),
  // Filled by seller after responding
  seller_id: model.text().nullable(),
  total_amount: model.bigNumber().nullable(),
  currency_code: model.text().default("usd"),
  // Buyer notes (e.g. delivery address requirements, special conditions)
  notes: model.text().nullable(),
  // Seller response notes
  seller_notes: model.text().nullable(),
  valid_until: model.dateTime().nullable(),
  responded_at: model.dateTime().nullable(),
  accepted_at: model.dateTime().nullable(),
  // Once accepted and order created, this stores the resulting order id
  order_id: model.text().nullable(),
  // Buyer-side identity (set when quote is created by an authenticated buyer)
  requested_by_customer_id: model.text().nullable(),
  buyer_org_id: model.text().nullable(),
  // Approval workflow
  approval_status: model
    .enum(ApprovalStatus)
    .default(ApprovalStatus.NOT_REQUIRED),
  approval_requested_at: model.dateTime().nullable(),
  approved_by_customer_id: model.text().nullable(),
  approved_at: model.dateTime().nullable(),
  approval_note: model.text().nullable(),
  items: model.hasMany(() => QuoteItem, { mappedBy: "quote" }),
})

export default Quote
