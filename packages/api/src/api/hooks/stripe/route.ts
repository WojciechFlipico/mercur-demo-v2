import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { markMilestonePaid } from "../../../lib/milestone-pay"
import { isStripeConfigured } from "../../../lib/stripe"

/**
 * POST /hooks/stripe
 *
 * Stripe webhook receiver. On payment_intent.succeeded for an intent we
 * created via /store/milestones/:id/payment-intent we look up the milestone
 * id in metadata and mark it paid.
 *
 * Note: signature verification is best-effort. If STRIPE_WEBHOOK_SECRET is
 * set we'd verify here — but Medusa's default body-parser already JSON-parses
 * the request, so a true Stripe signature check requires raw-body middleware
 * to be added. For the MVP demo we trust the metadata lookup; for production
 * see https://stripe.com/docs/webhooks/signatures.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  if (!isStripeConfigured()) {
    return res.status(503).json({ message: "Stripe not configured" })
  }

  const event = req.body as
    | {
        type?: string
        data?: { object?: { id?: string; metadata?: Record<string, string> } }
      }
    | undefined
  if (!event?.type) {
    return res.status(400).json({ message: "missing event type" })
  }

  if (event.type !== "payment_intent.succeeded") {
    // Other events ignored for MVP.
    return res.json({ received: true, ignored: event.type })
  }

  const intent = event.data?.object
  const milestoneId = intent?.metadata?.milestone_id
  if (!milestoneId) {
    logger.warn(`Stripe webhook: payment_intent.succeeded without milestone_id metadata (${intent?.id ?? "?"})`)
    return res.json({ received: true, ignored: "no milestone_id" })
  }

  const result = await markMilestonePaid(req.scope as any, milestoneId, {
    source: "stripe",
    payment_intent_id: intent?.id,
  })
  if (!result) {
    logger.warn(`Stripe webhook: milestone ${milestoneId} not found`)
    return res.status(404).json({ message: "milestone not found" })
  }
  if (result.alreadyPaid) {
    return res.json({ received: true, already_paid: true })
  }
  return res.json({ received: true, milestone_id: milestoneId, fully_paid: result.invoiceFullyPaid })
}
