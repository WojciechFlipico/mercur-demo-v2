import { model } from "@medusajs/framework/utils"

export const AuditActorType = {
  CUSTOMER: "customer",
  USER: "user",
  SELLER: "seller",
  SYSTEM: "system",
  ANONYMOUS: "anonymous",
} as const

export type AuditActorTypeT = (typeof AuditActorType)[keyof typeof AuditActorType]

const AuditEntry = model.define("audit_entry", {
  id: model.id({ prefix: "audit" }).primaryKey(),
  // What happened — short verb-style code, e.g. "quote.created", "quote.accepted".
  action: model.text(),
  // The resource the action targets, e.g. quote / invoice / milestone / buyer_org.
  resource_type: model.text(),
  resource_id: model.text(),
  // Who did it.
  actor_type: model
    .enum(AuditActorType)
    .default(AuditActorType.SYSTEM),
  actor_id: model.text().nullable(),
  actor_label: model.text().nullable(),
  // Optional contextual payload (status diffs, amounts, notes, etc.)
  payload: model.json().nullable(),
})

export default AuditEntry
