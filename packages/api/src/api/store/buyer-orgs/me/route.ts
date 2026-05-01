import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { BUYER_ORG_MODULE } from "../../../../modules/buyer-org"
import type BuyerOrgModuleService from "../../../../modules/buyer-org/service"
import { getCustomerId } from "../_auth"

/**
 * GET /store/buyer-orgs/me
 * Returns the authenticated buyer's primary org (first membership) plus role info.
 * Storefront uses this on every page to know whether the user can accept directly,
 * needs approval, or has approver privileges.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Customer auth required")
  }
  const orgService: BuyerOrgModuleService = req.scope.resolve(BUYER_ORG_MODULE)

  const memberships = await orgService.listBuyerMembers(
    { customer_id: customerId },
    { order: { created_at: "ASC" } }
  )
  if (memberships.length === 0) {
    return res.json({ customer_id: customerId, org: null, member: null })
  }

  const member = memberships[0]
  const [org] = await orgService.listBuyerOrgs(
    { id: member.org_id },
    { relations: ["members"] }
  )

  res.json({
    customer_id: customerId,
    org,
    member,
  })
}
