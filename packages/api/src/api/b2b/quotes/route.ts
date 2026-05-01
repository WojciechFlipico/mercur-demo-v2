import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { QUOTE_MODULE } from "../../../modules/quote"
import { QuoteStatus } from "../../../modules/quote/models"
import type QuoteModuleService from "../../../modules/quote/service"

/**
 * GET /b2b/quotes
 * Sellers see RFQs that are open (status=requested) plus their own responded quotes.
 *
 * MVP-demo only: seller identity passed via `x-seller-id` header.
 * Production version lives under /vendor/* with the Mercur seller-session middleware.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const sellerId = (req.headers["x-seller-id"] as string) || undefined
  const filterStatus = (req.query.status as string) || undefined

  const quoteService: QuoteModuleService = req.scope.resolve(QUOTE_MODULE)

  const filters: Record<string, unknown> = {}
  if (filterStatus) {
    filters.status = filterStatus
  } else {
    // Default: show open requests + this seller's responded quotes
    if (sellerId) {
      filters.$or = [
        { status: QuoteStatus.REQUESTED },
        { seller_id: sellerId },
      ]
    } else {
      filters.status = QuoteStatus.REQUESTED
    }
  }

  const quotes = await quoteService.listQuotes(filters, {
    relations: ["items"],
    order: { created_at: "DESC" },
  })

  res.json({ quotes, count: quotes.length })
}
