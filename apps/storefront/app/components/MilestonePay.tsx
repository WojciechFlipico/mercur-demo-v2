"use client"

import { useEffect, useState } from "react"
import { loadStripe, type Stripe } from "@stripe/stripe-js"
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js"
import { api, type Milestone } from "@/lib/api"

type Props = {
  milestone: Milestone
  onPaid: () => void
  onCancel: () => void
}

const stripeCache: Record<string, Promise<Stripe | null>> = {}
const getStripeInstance = (publishableKey: string) => {
  if (!stripeCache[publishableKey]) {
    stripeCache[publishableKey] = loadStripe(publishableKey)
  }
  return stripeCache[publishableKey]
}

function PayForm({
  milestone,
  onPaid,
}: {
  milestone: Milestone
  onPaid: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setBusy(true)
    setErr(null)
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    })
    if (error) {
      setErr(error.message ?? "Payment failed")
      setBusy(false)
      return
    }
    if (paymentIntent?.status === "succeeded") {
      // Webhook will mark paid; refresh in a moment.
      setTimeout(onPaid, 1000)
      return
    }
    setErr(`Payment status: ${paymentIntent?.status ?? "unknown"}`)
    setBusy(false)
  }

  return (
    <form onSubmit={onSubmit}>
      <PaymentElement />
      {err && (
        <div className="alert alert-error" style={{ marginTop: 12 }}>
          {err}
        </div>
      )}
      <button
        type="submit"
        className="btn"
        disabled={!stripe || busy}
        style={{ marginTop: 16, width: "100%" }}
      >
        {busy
          ? "Processing…"
          : `Pay ${milestone.amount} ${milestone.currency_code.toUpperCase()}`}
      </button>
    </form>
  )
}

export default function MilestonePay({ milestone, onPaid, onCancel }: Props) {
  const [intent, setIntent] = useState<{
    clientSecret: string
    publishableKey: string
    stripe: Promise<Stripe | null>
  } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [stripeUnavailable, setStripeUnavailable] = useState(false)

  useEffect(() => {
    api
      .createPaymentIntent(milestone.id)
      .then((r) => {
        if (!r.publishable_key) {
          setStripeUnavailable(true)
          return
        }
        setIntent({
          clientSecret: r.client_secret,
          publishableKey: r.publishable_key,
          stripe: getStripeInstance(r.publishable_key),
        })
      })
      .catch((e: Error) => {
        // Backend reports stripe_not_configured (503) explicitly
        if (e.message.includes("stripe_not_configured") || e.message.includes("503")) {
          setStripeUnavailable(true)
        } else {
          setErr(e.message)
        }
      })
  }, [milestone.id])

  const onMockPay = async () => {
    try {
      await api.payMilestoneManual(milestone.id)
      onPaid()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  if (stripeUnavailable) {
    return (
      <div className="card" style={{ background: "#fffbeb", borderColor: "#fde68a" }}>
        <div style={{ fontSize: 13, marginBottom: 12 }}>
          <strong>Stripe is not configured.</strong> In a live deployment the buyer
          would pay this milestone with a card. For the demo you can simulate the
          payment instead.
        </div>
        <div className="flex" style={{ justifyContent: "flex-end" }}>
          <button onClick={onCancel} className="btn secondary">
            Cancel
          </button>
          <button onClick={onMockPay} className="btn">
            Mark as paid (mock)
          </button>
        </div>
      </div>
    )
  }
  if (err) {
    return (
      <div className="card">
        <div className="alert alert-error">{err}</div>
        <button onClick={onCancel} className="btn secondary">
          Close
        </button>
      </div>
    )
  }
  if (!intent) {
    return <div className="card">Loading payment…</div>
  }

  return (
    <div className="card">
      <h3 style={{ margin: 0, marginBottom: 4 }}>Pay {milestone.label}</h3>
      <div className="muted" style={{ fontSize: 12, marginBottom: 16 }}>
        {milestone.amount} {milestone.currency_code.toUpperCase()} ·{" "}
        {Math.round(milestone.percentage)}% of invoice
      </div>
      <Elements
        stripe={intent.stripe}
        options={{ clientSecret: intent.clientSecret, appearance: { theme: "flat" } }}
      >
        <PayForm milestone={milestone} onPaid={onPaid} />
      </Elements>
      <button
        onClick={onCancel}
        className="btn secondary"
        style={{ marginTop: 12, width: "100%" }}
      >
        Cancel
      </button>
    </div>
  )
}
