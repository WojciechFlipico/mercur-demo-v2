// Lightweight Stripe singleton for milestone payments.
// We bypass the Medusa payment-collection flow on purpose: invoices and
// milestones are our own primitives, so we mint PaymentIntents directly
// against the milestone amount and reconcile via webhook.
import Stripe from "stripe"

let cached: Stripe | null = null

export function getStripe(): Stripe {
  if (cached) return cached
  const key = process.env.STRIPE_SECRET_API_KEY
  if (!key || key === "sk_test_supersecret") {
    throw new Error(
      "STRIPE_SECRET_API_KEY is not set. Configure a real test/live key on the API service."
    )
  }
  cached = new Stripe(key, {
    // Pin so version drift doesn't break us silently.
    apiVersion: "2025-04-30.basil" as Stripe.LatestApiVersion,
  })
  return cached
}

export function isStripeConfigured(): boolean {
  const k = process.env.STRIPE_SECRET_API_KEY
  return !!k && k !== "sk_test_supersecret"
}
