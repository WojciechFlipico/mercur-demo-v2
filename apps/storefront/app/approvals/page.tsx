"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { api, type Quote } from "@/lib/api"

export default function ApprovalsPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    api
      .pendingApprovals()
      .then((d) => setQuotes(d.quotes))
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const decide = async (q: Quote, decision: "approve" | "reject") => {
    const note =
      decision === "reject"
        ? prompt("Reason for rejection (optional)") ?? undefined
        : undefined
    setActing(q.id)
    try {
      await api.approveQuote(q.id, { decision, note })
      refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    } finally {
      setActing(null)
    }
  }

  return (
    <div>
      <div className="card">
        <h1>Pending approvals</h1>
        <p className="muted">
          Quotes whose total exceeds the requesting buyer&rsquo;s approval limit
          show up here for org admins and approvers to decide.
        </p>
      </div>

      {err && <div className="alert alert-error">{err}</div>}

      {loading ? (
        <div className="card">Loading…</div>
      ) : quotes.length === 0 ? (
        <div className="card">
          <div className="empty">Nothing waiting on you. ✓</div>
        </div>
      ) : (
        quotes.map((q) => (
          <div key={q.id} className="card">
            <div className="flex-between">
              <div>
                <Link href={`/rfq/${q.id}`}>
                  <code>{q.id}</code>
                </Link>
                <div className="muted" style={{ fontSize: 12 }}>
                  {q.buyer_email} · requested{" "}
                  {q.approval_requested_at
                    ? new Date(q.approval_requested_at).toLocaleString()
                    : "—"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  {q.total_amount} {q.currency_code.toUpperCase()}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {q.items.length} item(s)
                </div>
              </div>
            </div>
            {q.notes && (
              <div style={{ marginTop: 12 }}>
                <div className="kv-label">Buyer notes</div>
                <div>{q.notes}</div>
              </div>
            )}
            <table style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Line total</th>
                </tr>
              </thead>
              <tbody>
                {q.items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.title}</td>
                    <td>{it.quantity}</td>
                    <td>{it.unit_price ?? "—"}</td>
                    <td>
                      {it.unit_price != null
                        ? Number(it.unit_price) * it.quantity
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex" style={{ marginTop: 16, justifyContent: "flex-end" }}>
              <button
                className="btn secondary"
                onClick={() => decide(q, "reject")}
                disabled={acting === q.id}
              >
                Reject
              </button>
              <button
                className="btn"
                onClick={() => decide(q, "approve")}
                disabled={acting === q.id}
              >
                {acting === q.id ? "Working…" : "Approve & issue invoice"}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
