"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api, type Quote, type Me } from "@/lib/api"
import { getToken, onAuthChange } from "@/lib/auth"

const EMAIL_KEY = "buyerEmail"

const statusBadge: Record<Quote["status"], string> = {
  requested: "badge-blue",
  quoted: "badge-orange",
  accepted: "badge-green",
  rejected: "badge-red",
  expired: "badge-grey",
}
const approvalBadge: Record<Quote["approval_status"], string> = {
  not_required: "",
  pending: "badge-orange",
  approved: "badge-green",
  rejected: "badge-red",
}

export default function MyRfqsPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [me, setMe] = useState<Me | null>(null)

  // anon-mode lookup
  const [email, setEmail] = useState("")
  const [submittedEmail, setSubmittedEmail] = useState("")

  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track auth state
  useEffect(() => {
    const sync = () => {
      const t = getToken()
      setAuthed(!!t)
      if (t) {
        api.me().then(setMe).catch(() => setMe(null))
      } else {
        setMe(null)
      }
    }
    sync()
    return onAuthChange(sync)
  }, [])

  // For anon mode: hydrate stored email
  useEffect(() => {
    if (authed === false) {
      const stored = localStorage.getItem(EMAIL_KEY)
      if (stored) {
        setEmail(stored)
        setSubmittedEmail(stored)
      }
    }
  }, [authed])

  // Load quotes
  useEffect(() => {
    if (authed === null) return
    setLoading(true)
    setError(null)
    const p = authed
      ? api.listMyQuotes()
      : submittedEmail
        ? api.listMyQuotes(submittedEmail)
        : Promise.resolve({ quotes: [], count: 0 })
    p.then((d) => setQuotes(d.quotes))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [authed, submittedEmail, me?.org?.id])

  const onLookup = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    localStorage.setItem(EMAIL_KEY, email)
    setSubmittedEmail(email)
  }

  return (
    <div>
      <div className="card">
        <div className="flex-between">
          <h1 style={{ margin: 0 }}>My RFQs</h1>
          <Link href="/rfq/new" className="btn secondary">+ New RFQ</Link>
        </div>
        {!authed && (
          <>
            <form className="flex" onSubmit={onLookup} style={{ marginTop: 16 }}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your email"
                style={{ maxWidth: 320 }}
              />
              <button type="submit" className="btn">Look up</button>
            </form>
            <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
              Anonymous lookup by email. <Link href="/login">Sign in</Link> to use approval workflows and team features.
            </p>
          </>
        )}
        {authed && me?.org && (
          <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            Showing all RFQs for <strong>{me.org.name}</strong> (your role: {me.member?.role}).
          </p>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="muted">Loading…</div>
        ) : quotes.length === 0 ? (
          <div className="empty">
            No RFQs.
            <div style={{ marginTop: 12 }}>
              <Link href="/rfq/new" className="btn">Create one</Link>
            </div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Items</th>
                <th>Status</th>
                <th>Approval</th>
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
                    {q.approval_status === "not_required" ? (
                      <span className="muted" style={{ fontSize: 11 }}>—</span>
                    ) : (
                      <span className={`badge ${approvalBadge[q.approval_status]}`}>
                        {q.approval_status}
                      </span>
                    )}
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
    </div>
  )
}
