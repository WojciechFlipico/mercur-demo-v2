"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { api, type Quote, type Invoice, type Milestone } from "@/lib/api"
import MilestonePay from "@/app/components/MilestonePay"

const statusBadge: Record<Quote["status"], string> = {
  requested: "badge-blue",
  quoted: "badge-orange",
  accepted: "badge-green",
  rejected: "badge-red",
  expired: "badge-grey",
}

const milestoneBadge: Record<Milestone["status"], string> = {
  pending: "badge-grey",
  due: "badge-orange",
  paid: "badge-green",
  cancelled: "badge-grey",
}

export default function RfqDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [acceptResult, setAcceptResult] = useState<{
    invoice: Invoice
    milestones: Milestone[]
  } | null>(null)
  const [approvalNotice, setApprovalNotice] = useState<string | null>(null)
  const [postAcceptMilestones, setPostAcceptMilestones] = useState<{
    invoice: { id: string; invoice_number: string; amount_due: number; amount_paid: number; status: string; currency_code: string } | null
    milestones: Milestone[]
  } | null>(null)
  const [paying, setPaying] = useState<Milestone | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const { quote } = await api.getQuote(id)
      setQuote(quote)
      // For accepted quotes, hydrate the invoice + milestones for the pay UI
      if (quote.status === "accepted") {
        try {
          const r = await api.getInvoiceForQuote(quote.id)
          if (r.invoice) {
            setPostAcceptMilestones({ invoice: r.invoice as any, milestones: r.milestones })
          }
        } catch {
          /* ignore */
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const onAccept = async () => {
    if (!quote) return
    setAccepting(true)
    setError(null)
    try {
      const result = await api.acceptQuote(quote.id)
      if ("approval_required" in result && result.approval_required) {
        setApprovalNotice(result.message)
      } else if ("invoice" in result) {
        setAcceptResult({ invoice: result.invoice, milestones: result.milestones })
      }
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setAccepting(false)
    }
  }

  if (loading) return <div className="card">Loading…</div>
  if (error && !quote) return <div className="alert alert-error">{error}</div>
  if (!quote) return <div className="card">Not found</div>

  const lineTotal = (it: Quote["items"][number]) =>
    it.unit_price != null ? Number(it.unit_price) * it.quantity : null

  return (
    <div>
      <div className="card">
        <div className="flex-between">
          <div>
            <h1 style={{ margin: 0 }}>
              <code>{quote.id}</code>
            </h1>
            <p className="muted" style={{ marginTop: 4 }}>
              Created {new Date(quote.created_at).toLocaleString()}
            </p>
          </div>
          <span className={`badge ${statusBadge[quote.status]}`}>{quote.status}</span>
        </div>

        <div className="kvs" style={{ marginTop: 24 }}>
          <div>
            <div className="kv-label">Buyer</div>
            <div className="kv-value">
              {quote.buyer_company ?? "—"}
              <br />
              <span className="muted">{quote.buyer_email}</span>
            </div>
          </div>
          <div>
            <div className="kv-label">Supplier</div>
            <div className="kv-value">
              {quote.seller_id ? <code>{quote.seller_id}</code> : "Awaiting response"}
            </div>
          </div>
          <div>
            <div className="kv-label">Total</div>
            <div className="kv-value" style={{ fontWeight: 600 }}>
              {quote.total_amount != null
                ? `${quote.total_amount} ${quote.currency_code.toUpperCase()}`
                : "Not yet quoted"}
            </div>
            {quote.valid_until && (
              <div className="muted" style={{ fontSize: 12 }}>
                Valid until {new Date(quote.valid_until).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {quote.notes && (
          <div style={{ marginTop: 24 }}>
            <div className="kv-label">Your notes</div>
            <div>{quote.notes}</div>
          </div>
        )}
        {quote.seller_notes && (
          <div style={{ marginTop: 16 }}>
            <div className="kv-label">Supplier notes</div>
            <div>{quote.seller_notes}</div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Items</h2>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Qty</th>
              <th>Target unit</th>
              <th>Quoted unit</th>
              <th>Lead time</th>
              <th>Line total</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((it) => (
              <tr key={it.id}>
                <td>
                  <strong>{it.title}</strong>
                  {it.description && (
                    <div className="muted" style={{ fontSize: 12 }}>
                      {it.description}
                    </div>
                  )}
                </td>
                <td>{it.quantity}</td>
                <td>{it.target_unit_price ?? "—"}</td>
                <td>{it.unit_price ?? <span className="muted">—</span>}</td>
                <td>
                  {it.lead_time_days != null ? `${it.lead_time_days} d` : "—"}
                </td>
                <td>
                  <strong>{lineTotal(it) ?? "—"}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Approval state banners */}
      {quote.approval_status === "pending" && (
        <div className="alert alert-info">
          ⏳ This quote is pending approval from your org admin/approver.
        </div>
      )}
      {quote.approval_status === "rejected" && (
        <div className="alert alert-error">
          ✗ Approval was rejected{quote.approval_note ? `: ${quote.approval_note}` : "."}
        </div>
      )}
      {quote.approval_status === "approved" && (
        <div className="alert alert-success">
          ✓ Approved{quote.approval_note ? `: ${quote.approval_note}` : ""}.
        </div>
      )}

      {quote.status === "quoted" &&
        !acceptResult &&
        quote.approval_status !== "pending" && (
        <div className="card">
          <h2>Accept this quote</h2>
          <p className="muted">
            On acceptance we&rsquo;ll auto-generate an invoice for{" "}
            <strong>
              {quote.total_amount} {quote.currency_code.toUpperCase()}
            </strong>{" "}
            split into a default 30% deposit + 70% final-payment milestone schedule.
          </p>
          <p className="muted" style={{ fontSize: 12 }}>
            If your role&rsquo;s approval limit is below this total, the quote
            will be sent to an approver in your org first.
          </p>
          {error && <div className="alert alert-error">{error}</div>}
          {approvalNotice && (
            <div className="alert alert-info">{approvalNotice}</div>
          )}
          <button onClick={onAccept} className="btn" disabled={accepting}>
            {accepting ? "Submitting…" : "Accept quote"}
          </button>
        </div>
      )}

      {acceptResult && (
        <div className="card">
          <div className="alert alert-success">
            Quote accepted. Invoice {acceptResult.invoice.invoice_number} issued.
          </div>
          <h2>Payment milestones</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Label</th>
                <th>%</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {acceptResult.milestones.map((m) => (
                <tr key={m.id}>
                  <td>{m.sequence + 1}</td>
                  <td>{m.label}</td>
                  <td>{m.percentage}%</td>
                  <td>
                    {m.amount} {m.currency_code.toUpperCase()}
                  </td>
                  <td>
                    <span className={`badge ${milestoneBadge[m.status]}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="muted">
                    {m.due_at ? new Date(m.due_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted" style={{ marginTop: 16, fontSize: 12 }}>
            Pay each milestone below as it comes due — Stripe charges the card
            and the webhook updates the invoice automatically.
          </p>
        </div>
      )}

      {/* Persistent milestones section after accept (also after page reload) */}
      {postAcceptMilestones?.invoice && (
        <div className="card">
          <div className="flex-between">
            <div>
              <h2 style={{ margin: 0 }}>Invoice {postAcceptMilestones.invoice.invoice_number}</h2>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                {postAcceptMilestones.invoice.amount_paid} /{" "}
                {postAcceptMilestones.invoice.amount_due}{" "}
                {postAcceptMilestones.invoice.currency_code.toUpperCase()} paid
              </div>
            </div>
            <span className={`badge ${postAcceptMilestones.invoice.status === "paid" ? "badge-green" : "badge-blue"}`}>
              {postAcceptMilestones.invoice.status}
            </span>
          </div>
          <table style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Label</th>
                <th>%</th>
                <th>Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {postAcceptMilestones.milestones.map((m) => (
                <tr key={m.id}>
                  <td>{m.sequence + 1}</td>
                  <td>{m.label}</td>
                  <td>{m.percentage}%</td>
                  <td>
                    {m.amount} {m.currency_code.toUpperCase()}
                  </td>
                  <td>
                    <span className={`badge ${milestoneBadge[m.status]}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>
                    {m.status === "due" && (
                      <button
                        onClick={() => setPaying(m)}
                        className="btn"
                        style={{ padding: "4px 12px", fontSize: 12 }}
                      >
                        Pay
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {paying && (
        <MilestonePay
          milestone={paying}
          onPaid={() => {
            setPaying(null)
            load()
          }}
          onCancel={() => setPaying(null)}
        />
      )}

      <Link href="/rfq" className="muted">
        ← Back to my RFQs
      </Link>
    </div>
  )
}
