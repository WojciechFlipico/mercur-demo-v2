"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api, type Quote } from "@/lib/api"

const EMAIL_KEY = "buyerEmail"

const statusBadge: Record<Quote["status"], string> = {
  requested: "badge-blue",
  quoted: "badge-orange",
  accepted: "badge-green",
  rejected: "badge-red",
  expired: "badge-grey",
}

export default function MyRfqsPage() {
  const [email, setEmail] = useState("")
  const [submittedEmail, setSubmittedEmail] = useState("")
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(EMAIL_KEY)
    if (stored) {
      setEmail(stored)
      setSubmittedEmail(stored)
    }
  }, [])

  useEffect(() => {
    if (!submittedEmail) return
    setLoading(true)
    setError(null)
    api
      .listMyQuotes(submittedEmail)
      .then((d) => setQuotes(d.quotes))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [submittedEmail])

  const onLookup = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    localStorage.setItem(EMAIL_KEY, email)
    setSubmittedEmail(email)
  }

  return (
    <div>
      <div className="card">
        <h1>My RFQs</h1>
        <form className="flex" onSubmit={onLookup} style={{ marginTop: 16 }}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your email"
            style={{ maxWidth: 320 }}
          />
          <button type="submit" className="btn">
            Look up
          </button>
        </form>
        <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
          MVP demo: RFQs are looked up by email — no login required.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {submittedEmail && (
        <div className="card">
          <div className="flex-between">
            <h2 style={{ margin: 0 }}>RFQs for {submittedEmail}</h2>
            <Link href="/rfq/new" className="btn secondary">
              + New RFQ
            </Link>
          </div>
          {loading ? (
            <div className="muted" style={{ marginTop: 16 }}>
              Loading…
            </div>
          ) : quotes.length === 0 ? (
            <div className="empty">
              No RFQs yet for this email.
              <div style={{ marginTop: 12 }}>
                <Link href="/rfq/new" className="btn">
                  Create one
                </Link>
              </div>
            </div>
          ) : (
            <table style={{ marginTop: 16 }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <Link href={`/rfq/${q.id}`}>
                        <code>{q.id.slice(0, 22)}…</code>
                      </Link>
                    </td>
                    <td>{q.items.length}</td>
                    <td>
                      <span className={`badge ${statusBadge[q.status]}`}>
                        {q.status}
                      </span>
                    </td>
                    <td>
                      {q.total_amount != null
                        ? `${q.total_amount} ${q.currency_code.toUpperCase()}`
                        : "—"}
                    </td>
                    <td className="muted">
                      {new Date(q.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
