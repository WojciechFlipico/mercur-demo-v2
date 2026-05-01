import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { QUOTE_MODULE } from "../../../modules/quote"
import type QuoteModuleService from "../../../modules/quote/service"

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
 * Buyer creates a Request For Quotation. No auth — buyer is identified by email.
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
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  const [quote] = await quoteService.createQuotes([
    {
      buyer_email: body.buyer_email,
      buyer_name: body.buyer_name ?? null,
      buyer_company: body.buyer_company ?? null,
      notes: body.notes ?? null,
      currency_code: body.currency_code ?? "usd",
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

  logger.info(`RFQ created: ${quote.id} by ${body.buyer_email}`)

  // Return the full quote with items
  const [full] = await quoteService.listQuotes(
    { id: quote.id },
    { relations: ["items"] }
  )
  res.status(201).json({ quote: full })
}

/**
 * GET /store/quotes?buyer_email=...
 * Buyer lists their own quotes.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const buyerEmail = (req.query.buyer_email as string) || undefined
  if (!buyerEmail) {
    return res.status(400).json({ message: "buyer_email query param is required" })
  }

  const quoteService: QuoteModuleService = req.scope.resolve(QUOTE_MODULE)
  const quotes = await quoteService.listQuotes(
    { buyer_email: buyerEmail },
    { relations: ["items"], order: { created_at: "DESC" } }
  )

  res.json({ quotes, count: quotes.length })
}
