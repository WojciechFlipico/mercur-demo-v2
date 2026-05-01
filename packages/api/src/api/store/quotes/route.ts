import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { QUOTE_MODULE } from "../../../modules/quote"
import { BUYER_ORG_MODULE } from "../../../modules/buyer-org"
import type QuoteModuleService from "../../../modules/quote/service"
import type BuyerOrgModuleService from "../../../modules/buyer-org/service"
import { getCustomerId } from "../buyer-orgs/_auth"

type CreateQuoteBody = {
  buyer_email: string
  buyer_name?: string
  buyer_company?: string
  notes?: string
  currency_code?: string
  items: Array<{
    title: string
    description?: string
    product_id?: string
    variant_id?: string
    quantity: number
    target_unit_price?: number
    notes?: string
  }>
}

/**
 * POST /store/quotes
 * Create an RFQ. Works in two modes:
 *  - Anonymous (no auth): identified by `buyer_email` only. Approval workflow is skipped.
 *  - Authenticated (customer JWT): tied to the buyer's primary org. Approval rules apply on accept.
 */
export async function POST(
  req: MedusaRequest<CreateQuoteBody>,
  res: MedusaResponse
) {
  const body = req.body
  if (!body?.buyer_email) {
    return res.status(400).json({ message: "buyer_email is required" })
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return res.status(400).json({ message: "At least one item is required" })
  }

  const quoteService: QuoteModuleService = req.scope.resolve(QUOTE_MODULE)
  const orgService: BuyerOrgModuleService = req.scope.resolve(BUYER_ORG_MODULE)
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  const customerId = getCustomerId(req)
  let buyerOrgId: string | null = null
  if (customerId) {
    const [member] = await orgService.listBuyerMembers(
      { customer_id: customerId },
      { order: { created_at: "ASC" } }
    )
    buyerOrgId = member?.org_id ?? null
  }

  const [quote] = await quoteService.createQuotes([
    {
      buyer_email: body.buyer_email,
      buyer_name: body.buyer_name ?? null,
      buyer_company: body.buyer_company ?? null,
      notes: body.notes ?? null,
      currency_code: body.currency_code ?? "usd",
      requested_by_customer_id: customerId ?? null,
      buyer_org_id: buyerOrgId,
    },
  ])

  await quoteService.createQuoteItems(
    body.items.map((item) => ({
      quote_id: quote.id,
      title: item.title,
      description: item.description ?? null,
      product_id: item.product_id ?? null,
      variant_id: item.variant_id ?? null,
      quantity: item.quantity,
      target_unit_price: item.target_unit_price ?? null,
      notes: item.notes ?? null,
    }))
  )

  logger.info(
    `RFQ created: ${quote.id} by ${body.buyer_email}` +
      (customerId ? ` (customer ${customerId}, org ${buyerOrgId ?? "none"})` : "")
  )

  const [full] = await quoteService.listQuotes(
    { id: quote.id },
    { relations: ["items"] }
  )
  res.status(201).json({ quote: full })
}

/**
 * GET /store/quotes
 * - When authenticated: returns quotes for the caller's buyer_org (or quotes they
 *   personally requested when not yet in an org).
 * - When unauthenticated: requires `?buyer_email=...` query param.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  const quoteService: QuoteModuleService = req.scope.resolve(QUOTE_MODULE)
  const orgService: BuyerOrgModuleService = req.scope.resolve(BUYER_ORG_MODULE)

  if (customerId) {
    const [member] = await orgService.listBuyerMembers(
      { customer_id: customerId },
      { order: { created_at: "ASC" } }
    )
    const filter: Record<string, unknown> = member?.org_id
      ? { buyer_org_id: member.org_id }
      : { requested_by_customer_id: customerId }
    const quotes = await quoteService.listQuotes(filter, {
      relations: ["items"],
      order: { created_at: "DESC" },
    })
    return res.json({ quotes, count: quotes.length })
  }

  const buyerEmail = (req.query.buyer_email as string) || undefined
  if (!buyerEmail) {
    return res
      .status(400)
      .json({ message: "buyer_email query param is required when unauthenticated" })
  }
  const quotes = await quoteService.listQuotes(
    { buyer_email: buyerEmail },
    { relations: ["items"], order: { created_at: "DESC" } }
  )
  res.json({ quotes, count: quotes.length })
}
