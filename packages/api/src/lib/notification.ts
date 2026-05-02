import type { MedusaContainer } from "@medusajs/framework/types"
import { NOTIFICATION_MODULE } from "../modules/notification"
import { NotifRecipient } from "../modules/notification/models"
import type NotificationModuleService from "../modules/notification/service"

export type NotifInput = {
  recipient_type: (typeof NotifRecipient)[keyof typeof NotifRecipient]
  recipient_id: string
  kind: string
  title: string
  body?: string
  link?: string
  payload?: Record<string, unknown>
}

/**
 * Best-effort notification creation. Supports broadcasting to multiple recipients
 * by passing an array; a single failed entry won't abort the rest.
 */
export async function notify(
  container: MedusaContainer,
  input: NotifInput | NotifInput[]
): Promise<void> {
  const items = Array.isArray(input) ? input : [input]
  if (items.length === 0) return
  try {
    const svc: NotificationModuleService = container.resolve(NOTIFICATION_MODULE)
    await svc.createNotifications(
      items.map((i) => ({
        recipient_type: i.recipient_type,
        recipient_id: i.recipient_id,
        kind: i.kind,
        title: i.title,
        body: i.body ?? null,
        link: i.link ?? null,
        payload: i.payload ?? null,
      }))
    )
  } catch {
    /* never block the main flow */
  }
}
