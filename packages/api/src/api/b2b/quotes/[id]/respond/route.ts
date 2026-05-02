import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { QUOTE_MODULE } from "../../../../../modules/quote"
import { QuoteStatus } from "../../../../../modules/quote/models"
import type QuoteModuleService from "../../../../../modules/quote/service"
import { recordAudit } from "../../../../../lib/audit"
import { notify } from "../../../../../lib/notification"
import { NotifRecipient } from "../../../../../modules/notification/models"

type RespondToQuoteBody = {
  // Map of quote_item id -> { unit_price, lead_time_days?, notes? }
  items: Array<{
    id: string
    unit_price: number
    lead_time_days?: number
    notes?: string
  }>
  seller_notes?: string
  valid_for_days?: number // defaults to 14
}

/**
 * POST /b2b/quotes/:id/respond
 * Seller submits prices for each item in an RFQ.
 * MVP-demo: seller identity passed via `x-seller-id` header.
 */
export async function POST(
  req: MedusaRequest<RespondToQuoteBody>,
  res: MedusaResponse
) {
  const id = req.params.id
  const sellerId = (req.headers["x-seller-id"] as string) || undefined
  if (!sellerId) {
    return res.status(400).json({ message: "x-seller-id header is required" })
  }

  const body = req.body
  if (!Array.isArray(body?.items) || body.items.length === 0) {
    return res.status(400).json({ message: "items array is required" })
  }

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const quoteService: QuoteModuleService = req.scope.resolve(QUOTE_MODULE)

  const [quote] = await quoteService.listQuotes(
    { id },
    { relations: ["items"] }
  )
  if (!quote) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Quote ${id} not found`)
  }
  if (quote.status !== QuoteStatus.REQUESTED) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Quote must be in 'requested' state to receive a response (current: ${quote.status})`
    )
  }

  // Update each quote item's pricing
  const itemMap = new Map(quote.items.map((i: any) => [i.id, i]))
  let total = 0
  for (const submitted of body.items) {
    const item: any = itemMap.get(submitted.id)
    if (!item) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Quote item ${submitted.id} not found in this quote`
      )
    }
    await quoteService.updateQuoteItems({
      selector: { id: submitted.id },
      data: {
        unit_price: submitted.unit_price,
        lead_time_days: submitted.lead_time_days ?? null,
        notes: submitted.notes ?? null,
      },
    })
    total += submitted.unit_price * item.quantity
  }

  const validForDays = body.valid_for_days ?? 14
  const respondedAt = new Date()
  const validUntil = new Date(
    respondedAt.getTime() + validForDays * 24 * 60 * 60 * 1000
  )

  await quoteService.updateQuotes({
    selector: { id: quote.id },
    data: {
      status: QuoteStatus.QUOTED,
      seller_id: sellerId,
      total_amount: total,
      seller_notes: body.seller_notes ?? null,
      responded_at: respondedAt,
      valid_until: validUntil,
    },
  })

  logger.info(
    `Quote ${quote.id} responded by seller ${sellerId}, total=${total} ${quote.currency_code}`
  )

  await recordAudit(req, {
    action: "quote.responded",
    resource_type: "quote",
    resource_id: quote.id,
    payload: {
      seller_id: sellerId,
      total_amount: total,
      currency_code: quote.currency_code,
      valid_until: validUntil.toISOString(),
    },
  })

  // Notify the requester (or fall back to email-keyed notification when anon)
  if (quote.requested_by_customer_id) {
    await notify(req.scope as any, {
      recipient_type: NotifRecipient.CUSTOMER,
      recipient_id: quote.requested_by_customer_id,
      kind: "quote.responded",
      title: `Quote ready: ${total} ${quote.currency_code.toUpperCase()}`,
      body: `${quote.buyer_company ?? "Your RFQ"} got a price from a supplier. Valid until ${validUntil.toLocaleDateString()}.`,
      link: `/rfq/${quote.id}`,
      payload: { quote_id: quote.id, total_amount: total },
    })
  }

  const [updated] = await quoteService.listQuotes(
    { id: quote.id },
    { relations: ["items"] }
  )
  res.json({ quote: updated })
}
