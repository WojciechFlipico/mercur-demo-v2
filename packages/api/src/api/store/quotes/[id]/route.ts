import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { QUOTE_MODULE } from "../../../../modules/quote"
import type QuoteModuleService from "../../../../modules/quote/service"

/**
 * GET /store/quotes/:id
 * Buyer fetches a single quote (with seller's response if any).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id
  const quoteService: QuoteModuleService = req.scope.resolve(QUOTE_MODULE)
  const [quote] = await quoteService.listQuotes(
    { id },
    { relations: ["items"] }
  )
  if (!quote) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Quote ${id} not found`)
  }
  res.json({ quote })
}
