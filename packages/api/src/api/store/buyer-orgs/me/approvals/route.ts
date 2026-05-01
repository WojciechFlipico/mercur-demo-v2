import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { BUYER_ORG_MODULE } from "../../../../../modules/buyer-org"
import { BuyerRole } from "../../../../../modules/buyer-org/models"
import { QUOTE_MODULE } from "../../../../../modules/quote"
import { ApprovalStatus } from "../../../../../modules/quote/models"
import type BuyerOrgModuleService from "../../../../../modules/buyer-org/service"
import type QuoteModuleService from "../../../../../modules/quote/service"
import { getCustomerId } from "../../_auth"

/**
 * GET /store/buyer-orgs/me/approvals
 * Pending-approval quotes for the caller's org. Empty for non-approver/admin members.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Customer auth required")
  }
  const orgService: BuyerOrgModuleService = req.scope.resolve(BUYER_ORG_MODULE)
  const quoteService: QuoteModuleService = req.scope.resolve(QUOTE_MODULE)

  const [member] = await orgService.listBuyerMembers({ customer_id: customerId })
  if (!member) {
    return res.json({ quotes: [], count: 0 })
  }
  if (member.role !== BuyerRole.ADMIN && member.role !== BuyerRole.APPROVER) {
    return res.json({ quotes: [], count: 0 })
  }
  const pending = await quoteService.listQuotes(
    { buyer_org_id: member.org_id, approval_status: ApprovalStatus.PENDING },
    { relations: ["items"], order: { created_at: "DESC" } }
  )
  res.json({ quotes: pending, count: pending.length })
}
