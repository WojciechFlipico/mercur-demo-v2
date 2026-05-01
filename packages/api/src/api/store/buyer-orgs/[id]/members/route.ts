import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { BUYER_ORG_MODULE } from "../../../../../modules/buyer-org"
import { BuyerRole } from "../../../../../modules/buyer-org/models"
import type { BuyerRoleType } from "../../../../../modules/buyer-org/models"
import type BuyerOrgModuleService from "../../../../../modules/buyer-org/service"
import { getCustomerId } from "../../_auth"
import { recordAudit } from "../../../../../lib/audit"

type AddMemberBody = {
  email: string
  name?: string
  role?: "buyer" | "approver" | "admin"
  approval_limit?: number
}

async function requireOrgAdmin(
  req: MedusaRequest,
  orgId: string
): Promise<{ orgService: BuyerOrgModuleService; customerId: string }> {
  const customerId = getCustomerId(req)
  if (!customerId) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Customer auth required")
  }
  const orgService: BuyerOrgModuleService = req.scope.resolve(BUYER_ORG_MODULE)
  const [me] = await orgService.listBuyerMembers({
    org_id: orgId,
    customer_id: customerId,
  })
  if (!me || me.role !== BuyerRole.ADMIN) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Only org admins can manage members"
    )
  }
  return { orgService, customerId }
}

/**
 * GET /store/buyer-orgs/:id/members
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Customer auth required")
  }
  const orgService: BuyerOrgModuleService = req.scope.resolve(BUYER_ORG_MODULE)
  // Caller must be a member to read the list
  const [self] = await orgService.listBuyerMembers({
    org_id: req.params.id,
    customer_id: customerId,
  })
  if (!self) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Not a member of this org")
  }
  const members = await orgService.listBuyerMembers(
    { org_id: req.params.id },
    { order: { created_at: "ASC" } }
  )
  res.json({ members, count: members.length })
}

/**
 * POST /store/buyer-orgs/:id/members
 * Admin invites a new member. Member is created without a customer_id; once the
 * invitee registers and lookups by email, the member row is associated.
 */
export async function POST(req: MedusaRequest<AddMemberBody>, res: MedusaResponse) {
  const orgId = req.params.id
  const { orgService } = await requireOrgAdmin(req, orgId)

  const body = req.body
  if (!body?.email?.trim()) {
    return res.status(400).json({ message: "email is required" })
  }

  const [existing] = await orgService.listBuyerMembers({
    org_id: orgId,
    email: body.email.trim().toLowerCase(),
  })
  if (existing) {
    return res.status(409).json({ message: "Member with this email already exists" })
  }

  const [member] = await orgService.createBuyerMembers([
    {
      org_id: orgId,
      email: body.email.trim().toLowerCase(),
      name: body.name ?? null,
      role: (body.role as BuyerRoleType) ?? BuyerRole.BUYER,
      approval_limit: body.approval_limit ?? null,
    },
  ])
  await recordAudit(req, {
    action: "buyer_member.invited",
    resource_type: "buyer_member",
    resource_id: member.id,
    payload: {
      org_id: orgId,
      email: member.email,
      role: member.role,
      approval_limit: body.approval_limit ?? null,
    },
  })
  res.status(201).json({ member })
}
