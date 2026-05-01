import { Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"

/**
 * Create a Medusa Order from an accepted Quote, so the marketplace's standard
 * order workflows (fulfillment, returns, customer order history) become
 * available alongside our custom invoice/milestone records.
 *
 * Returns the new order id (or null if creation was skipped — e.g. when no
 * region exists yet).
 */
export async function createMedusaOrderFromQuote(
  container: MedusaContainer,
  quote: {
    id: string
    buyer_email: string
    requested_by_customer_id: string | null
    currency_code: string
    total_amount: unknown
    items: Array<{
      title: string
      description: string | null
      quantity: number
      unit_price: unknown
      product_id: string | null
      variant_id: string | null
    }>
  }
): Promise<{ orderId: string | null; reason?: string }> {
  // Find a region to attach the order to. Order requires region_id for currency reconciliation.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const regionService = container.resolve(Modules.REGION) as any
  const regions = await regionService.listRegions(
    {},
    { take: 1 }
  )
  if (!regions?.length) {
    return { orderId: null, reason: "no region available" }
  }
  const region = regions[0]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderService = container.resolve(Modules.ORDER) as any
  const items = quote.items
    .filter((it) => it.unit_price != null)
    .map((it) => ({
      title: it.title,
      quantity: it.quantity,
      unit_price: Number(it.unit_price),
      product_id: it.product_id ?? undefined,
      variant_id: it.variant_id ?? undefined,
    }))

  if (items.length === 0) {
    return { orderId: null, reason: "no priced items on the quote" }
  }

  try {
    const created = await orderService.createOrders([
      {
        region_id: region.id,
        currency_code: quote.currency_code,
        email: quote.buyer_email,
        customer_id: quote.requested_by_customer_id ?? undefined,
        status: "pending",
        items,
        metadata: { source_quote_id: quote.id },
      },
    ])
    const order = Array.isArray(created) ? created[0] : created
    return { orderId: order.id }
  } catch (e) {
    return {
      orderId: null,
      reason: `order creation failed: ${(e as Error).message}`,
    }
  }
}
