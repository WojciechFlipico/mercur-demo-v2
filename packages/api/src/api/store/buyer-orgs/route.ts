import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { BUYER_ORG_MODULE } from "../../../modules/buyer-org"
import { BuyerRole } from "../../../modules/buyer-org/models"
import type BuyerOrgModuleService from "../../../modules/buyer-org/service"
import { getCustomerId } from "./_auth"
import { recordAudit } from "../../../lib/audit"

type CreateOrgBody = {
  name: string
  approval_threshold?: number
  currency_code?: string
  notes?: string
  // The creator becomes the org admin. Optional name/email override their member row.
  member_name?: string
  member_email?: string
}

/**
 * POST /store/buyer-orgs
 * Authenticated customer creates a buyer organization. They become the admin member.
 */
export async function POST(req: MedusaRequest<CreateOrgBody>, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Customer auth required")
  }
  const body = req.body
  if (!body?.name?.trim()) {
    return res.status(400).json({ message: "name is required" })
  }

  const orgService: BuyerOrgModuleService = req.scope.resolve(BUYER_ORG_MODULE)
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  // Look up customer for default member email
  let memberEmail = body.member_email
  if (!memberEmail) {
    try {
      const customerService = req.scope.resolve("customer") as {
        retrieveCustomer: (id: string) => Promise<{ email: string }>
      }
      const customer = await customerService.retrieveCustomer(customerId)
      memberEmail = customer.email
    } catch {
      memberEmail = `${customerId}@unknown`
    }
  }

  const [org] = await orgService.createBuyerOrgs([
    {
      name: body.name.trim(),
      owner_customer_id: customerId,
      approval_threshold: body.approval_threshold ?? null,
      currency_code: body.currency_code ?? "usd",
      notes: body.notes ?? null,
    },
  ])

  await orgService.createBuyerMembers([
    {
      org_id: org.id,
      customer_id: customerId,
      email: memberEmail!,
      name: body.member_name ?? null,
      role: BuyerRole.ADMIN,
    },
  ])

  logger.info(`Buyer org created: ${org.id} by customer ${customerId}`)
  await recordAudit(req, {
    action: "buyer_org.created",
    resource_type: "buyer_org",
    resource_id: org.id,
    payload: {
      name: org.name,
      approval_threshold: body.approval_threshold ?? null,
      currency_code: body.currency_code ?? "usd",
    },
  })
  res.status(201).json({ org })
}

/**
 * GET /store/buyer-orgs
 * Authenticated customer lists orgs they are a member of.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Customer auth required")
  }
  const orgService: BuyerOrgModuleService = req.scope.resolve(BUYER_ORG_MODULE)

  const memberships = await orgService.listBuyerMembers({ customer_id: customerId })
  const orgs = memberships.length
    ? await orgService.listBuyerOrgs(
        { id: memberships.map((m) => m.org_id) },
        { relations: ["members"] }
      )
    : []

  // Attach the caller's role per org.
  const enriched = orgs.map((o) => {
    const my = memberships.find((m) => m.org_id === o.id)
    return { ...o, my_role: my?.role, my_member_id: my?.id, my_approval_limit: my?.approval_limit }
  })

  res.json({ orgs: enriched, count: enriched.length })
}
