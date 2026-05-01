"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api, type QuoteItemDraft } from "@/lib/api"

const EMAIL_KEY = "buyerEmail"

type DraftItem = QuoteItemDraft & { _key: string }

const emptyItem = (): DraftItem => ({
  _key: Math.random().toString(36).slice(2),
  title: "",
  quantity: 1,
})

export default function NewRfqPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [company, setCompany] = useState("")
  const [currency, setCurrency] = useState("eur")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<DraftItem[]>([emptyItem()])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(EMAIL_KEY)
    if (stored) setEmail(stored)
  }, [])

  const updateItem = (key: string, patch: Partial<DraftItem>) => {
    setItems((arr) => arr.map((it) => (it._key === key ? { ...it, ...patch } : it)))
  }
  const addItem = () => setItems((arr) => [...arr, emptyItem()])
  const removeItem = (key: string) =>
    setItems((arr) => arr.filter((it) => it._key !== key))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email) return setError("Email is required")
    if (items.length === 0 || items.some((i) => !i.title || !i.quantity)) {
      return setError("Each item needs a title and quantity")
    }
    setSubmitting(true)
    try {
      localStorage.setItem(EMAIL_KEY, email)
      const { quote } = await api.createQuote({
        buyer_email: email,
        buyer_name: name || undefined,
        buyer_company: company || undefined,
        currency_code: currency,
        notes: notes || undefined,
        items: items.map(({ _key, ...rest }) => rest),
      })
      router.push(`/rfq/${quote.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setSubmitting(false)
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <h1>New Request For Quotation</h1>
      <p className="muted">
        Tell suppliers what you need. They&rsquo;ll get back with prices and lead times.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <h2 style={{ marginTop: 32 }}>Your details</h2>
      <div className="row">
        <div>
          <label>Email *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourcompany.com"
          />
        </div>
        <div>
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
          />
        </div>
      </div>
      <div className="row">
        <div>
          <label>Company</label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="ACME Corp"
          />
        </div>
        <div>
          <label>Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="eur">EUR</option>
            <option value="usd">USD</option>
            <option value="gbp">GBP</option>
          </select>
        </div>
      </div>

      <h2 style={{ marginTop: 32 }}>Items</h2>
      <table>
        <thead>
          <tr>
            <th>Title *</th>
            <th>Description</th>
            <th>Qty *</th>
            <th>Target unit price</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it._key}>
              <td>
                <input
                  required
                  value={it.title}
                  onChange={(e) => updateItem(it._key, { title: e.target.value })}
                  placeholder="e.g. Industrial widgets type A"
                />
              </td>
              <td>
                <input
                  value={it.description ?? ""}
                  onChange={(e) =>
                    updateItem(it._key, { description: e.target.value || undefined })
                  }
                  placeholder="optional spec/notes"
                />
              </td>
              <td style={{ width: 80 }}>
                <input
                  type="number"
                  min={1}
                  required
                  value={it.quantity}
                  onChange={(e) =>
                    updateItem(it._key, { quantity: Number(e.target.value) })
                  }
                />
              </td>
              <td style={{ width: 110 }}>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={it.target_unit_price ?? ""}
                  onChange={(e) =>
                    updateItem(it._key, {
                      target_unit_price: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </td>
              <td>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(it._key)}
                    className="btn secondary"
                  >
                    Remove
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={addItem}
        className="btn secondary"
        style={{ marginTop: 12 }}
      >
        + Add item
      </button>

      <div className="field" style={{ marginTop: 32 }}>
        <label>Notes for supplier</label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Delivery requirements, certifications, timeline…"
        />
      </div>

      <div className="flex-between" style={{ marginTop: 24 }}>
        <span className="muted">{items.length} item(s) in this RFQ</span>
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit RFQ"}
        </button>
      </div>
    </form>
  )
}
