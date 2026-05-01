import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { QUOTE_MODULE } from "../../../modules/quote"
import type QuoteModuleService from "../../../modules/quote/service"

/**
 * GET /admin/quotes
 * Admin view: all RFQs in the marketplace.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const status = (req.query.status as string) || undefined
  const quoteService: QuoteModuleService = req.scope.resolve(QUOTE_MODULE)

  const filters: Record<string, unknown> = {}
  if (status) filters.status = status

  const quotes = await quoteService.listQuotes(filters, {
    relations: ["items"],
    order: { created_at: "DESC" },
  })

  res.json({ quotes, count: quotes.length })
}
