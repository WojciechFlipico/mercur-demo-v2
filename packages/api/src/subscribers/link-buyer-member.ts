import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { BUYER_ORG_MODULE } from "../modules/buyer-org"
import type BuyerOrgModuleService from "../modules/buyer-org/service"

/**
 * When a customer record is created, look up any existing BuyerMember rows
 * matching the same email (created via /store/buyer-orgs/:id/members invites
 * before the invitee registered) and stamp them with the new customer_id so
 * the membership is linked automatically.
 */
export default async function linkBuyerMember({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const customerService = container.resolve(Modules.CUSTOMER) as {
    retrieveCustomer: (id: string) => Promise<{ id: string; email: string }>
  }
  const orgService: BuyerOrgModuleService = container.resolve(BUYER_ORG_MODULE)

  let customer
  try {
    customer = await customerService.retrieveCustomer(event.data.id)
  } catch (e) {
    logger.warn(
      `link-buyer-member: customer ${event.data.id} not found: ${(e as Error).message}`
    )
    return
  }

  const pendingMembers = await orgService.listBuyerMembers({
    email: customer.email.toLowerCase(),
    customer_id: null,
  })
  if (pendingMembers.length === 0) return

  await orgService.updateBuyerMembers({
    selector: { id: pendingMembers.map((m) => m.id) },
    data: { customer_id: customer.id },
  })
  logger.info(
    `link-buyer-member: linked ${pendingMembers.length} pending member(s) for ${customer.email} → customer ${customer.id}`
  )
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
