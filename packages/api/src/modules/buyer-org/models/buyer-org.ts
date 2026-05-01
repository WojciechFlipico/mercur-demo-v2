import { model } from "@medusajs/framework/utils"
import BuyerMember from "./buyer-member"

const BuyerOrg = model.define("buyer_org", {
  id: model.id({ prefix: "borg" }).primaryKey(),
  name: model.text(),
  // Customer ID of the org owner (admin role implicitly)
  owner_customer_id: model.text(),
  // Quotes whose total exceeds this require an approver to accept.
  // Null = no approval required regardless of amount.
  approval_threshold: model.bigNumber().nullable(),
  currency_code: model.text().default("usd"),
  notes: model.text().nullable(),
  members: model.hasMany(() => BuyerMember, { mappedBy: "org" }),
})

export default BuyerOrg
