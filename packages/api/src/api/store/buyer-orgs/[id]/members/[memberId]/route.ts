import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { BUYER_ORG_MODULE } from "../../../../../../modules/buyer-org"
import { BuyerRole } from "../../../../../../modules/buyer-org/models"
import type BuyerOrgModuleService from "../../../../../../modules/buyer-org/service"
import { getCustomerId } from "../../../_auth"
import { recordAudit } from "../../../../../../lib/audit"

type PatchMemberBody = {
  role?: "buyer" | "approver" | "admin"
  approval_limit?: number | null
  name?: string
}

async function requireOrgAdmin(req: MedusaRequest, orgId: string) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Customer auth required")
  }
  const orgService: BuyerOrgModuleService = req.scope.resolve(BUYER_ORG_MODULE)
  const [self] = await orgService.listBuyerMembers({
    org_id: orgId,
    customer_id: customerId,
  })
  if (!self || self.role !== BuyerRole.ADMIN) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Only org admins can manage members"
    )
  }
  return { orgService }
}

/**
 * PATCH /store/buyer-orgs/:id/members/:memberId
 */
export async function PATCH(req: MedusaRequest<PatchMemberBody>, res: MedusaResponse) {
  const { id: orgId, memberId } = req.params as { id: string; memberId: string }
  const { orgService } = await requireOrgAdmin(req, orgId)
  const body = req.body
  await orgService.updateBuyerMembers({
    selector: { id: memberId, org_id: orgId },
    data: {
      role: body.role,
      approval_limit: body.approval_limit,
      name: body.name,
    },
  })
  const [member] = await orgService.listBuyerMembers({ id: memberId })
  await recordAudit(req, {
    action: "buyer_member.updated",
    resource_type: "buyer_member",
    resource_id: memberId,
    payload: {
      org_id: orgId,
      role: body.role,
      approval_limit: body.approval_limit,
      name: body.name,
    },
  })
  res.json({ member })
}

/**
 * DELETE /store/buyer-orgs/:id/members/:memberId
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id: orgId, memberId } = req.params as { id: string; memberId: string }
  const { orgService } = await requireOrgAdmin(req, orgId)
  await orgService.deleteBuyerMembers([memberId])
  await recordAudit(req, {
    action: "buyer_member.removed",
    resource_type: "buyer_member",
    resource_id: memberId,
    payload: { org_id: orgId },
  })
  res.json({ id: memberId, deleted: true })
}
