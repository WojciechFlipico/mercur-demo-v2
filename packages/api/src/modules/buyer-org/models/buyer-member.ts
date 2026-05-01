import { model } from "@medusajs/framework/utils"
import BuyerOrg from "./buyer-org"

export const BuyerRole = {
  ADMIN: "admin",
  APPROVER: "approver",
  BUYER: "buyer",
} as const

export type BuyerRoleType = (typeof BuyerRole)[keyof typeof BuyerRole]

const BuyerMember = model.define("buyer_member", {
  id: model.id({ prefix: "bmem" }).primaryKey(),
  // Medusa customer id this member is linked to (null until they register)
  customer_id: model.text().nullable(),
  email: model.text(),
  name: model.text().nullable(),
  role: model.enum(BuyerRole).default(BuyerRole.BUYER),
  // Per-member personal approval limit (overrides org threshold for accept).
  // If null, member can accept up to the org's approval_threshold (or all amounts if threshold is null).
  approval_limit: model.bigNumber().nullable(),
  org: model.belongsTo(() => BuyerOrg, { mappedBy: "members" }),
})

export default BuyerMember
