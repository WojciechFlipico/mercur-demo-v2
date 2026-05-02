import { model } from "@medusajs/framework/utils"

export const NotifRecipient = {
  CUSTOMER: "customer",
  SELLER: "seller",
  USER: "user",
} as const

export type NotifRecipientT = (typeof NotifRecipient)[keyof typeof NotifRecipient]

const Notification = model.define("app_notification", {
  id: model.id({ prefix: "ntf" }).primaryKey(),
  recipient_type: model.enum(NotifRecipient),
  recipient_id: model.text(),
  // Short machine-readable kind (e.g. "quote.responded"), maps to
  // the related action in our audit trail when relevant.
  kind: model.text(),
  title: model.text(),
  body: model.text().nullable(),
  // In-app deep link target the UI can navigate to.
  link: model.text().nullable(),
  // Optional structured payload (resource ids etc.)
  payload: model.json().nullable(),
  read_at: model.dateTime().nullable(),
})

export default Notification
