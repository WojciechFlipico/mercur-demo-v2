import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { Container, Heading, Badge, Table, Text, Input, Button, Textarea } from "@medusajs/ui"

export const config: RouteConfig = {
  label: "RFQ",
  nested: "/quotes",
}

export const handle = {
  breadcrumb: () => "RFQ details",
}

declare const __BACKEND_URL__: string
const DEMO_SELLER_ID = "sel_demo"

type QuoteItem = {
  id: string
  title: string
  description: string | null
  quantity: number
  target_unit_price: number | null
  unit_price: number | null
  lead_time_days: number | null
  notes: string | null
}
type Quote = {
  id: string
  buyer_email: string
  buyer_name: string | null
  buyer_company: string | null
  status: string
  seller_id: string | null
  total_amount: number | null
  currency_code: string
  notes: string | null
  seller_notes: string | null
  valid_until: string | null
  created_at: string
  items: QuoteItem[]
}

type ItemDraft = { unit_price: string; lead_time_days: string }

const VendorQuoteDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({})
  const [sellerNotes, setSellerNotes] = useState("")
  const [validForDays, setValidForDays] = useState("14")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`${__BACKEND_URL__}/b2b/quotes`, {
      credentials: "include",
      headers: { "x-seller-id": DEMO_SELLER_ID },
    })
      .then((r) => r.json())
      .then((d) => {
        const q: Quote | undefined = (d.quotes ?? []).find((x: Quote) => x.id === id)
        setQuote(q ?? null)
        if (q) {
          const init: Record<string, ItemDraft> = {}
          q.items.forEach((it) => {
            init[it.id] = {
              unit_price: it.unit_price?.toString() ?? "",
              lead_time_days: it.lead_time_days?.toString() ?? "",
            }
          })
          setDrafts(init)
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  const submit = async () => {
    if (!quote) return
    setSubmitting(true)
    setError(null)
    try {
      const items = quote.items.map((it) => ({
        id: it.id,
        unit_price: Number(drafts[it.id]?.unit_price || 0),
        lead_time_days: drafts[it.id]?.lead_time_days
          ? Number(drafts[it.id].lead_time_days)
          : undefined,
      }))
      const res = await fetch(`${__BACKEND_URL__}/b2b/quotes/${quote.id}/respond`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-seller-id": DEMO_SELLER_ID,
        },
        body: JSON.stringify({
          items,
          seller_notes: sellerNotes || undefined,
          valid_for_days: Number(validForDays) || 14,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      navigate("/quotes")
    } catch (e: any) {
      setError(e.message ?? String(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Container className="p-6">Loading…</Container>
  if (!quote) return <Container className="p-6">Not found</Container>

  const isOpen = quote.status === "requested"
  const computedTotal = quote.items.reduce((sum, it) => {
    const price = Number(drafts[it.id]?.unit_price || 0)
    return sum + price * it.quantity
  }, 0)

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading>{quote.id}</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              From {quote.buyer_company ?? quote.buyer_email} ·{" "}
              {new Date(quote.created_at).toLocaleString()}
            </Text>
          </div>
          <Badge size="base">{quote.status}</Badge>
        </div>
        {quote.notes && (
          <div className="px-6 py-4">
            <Text className="text-ui-fg-subtle text-xs uppercase">Buyer notes</Text>
            <div className="text-sm">{quote.notes}</div>
          </div>
        )}
      </Container>

      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">
            {isOpen ? "Submit your prices" : "Your response"}
          </Heading>
        </div>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Item</Table.HeaderCell>
              <Table.HeaderCell>Qty</Table.HeaderCell>
              <Table.HeaderCell>Target unit</Table.HeaderCell>
              <Table.HeaderCell>Your unit price</Table.HeaderCell>
              <Table.HeaderCell>Lead time (days)</Table.HeaderCell>
              <Table.HeaderCell>Line total</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {quote.items.map((it) => {
              const price = Number(drafts[it.id]?.unit_price || 0)
              return (
                <Table.Row key={it.id}>
                  <Table.Cell>
                    <div className="font-medium">{it.title}</div>
                    {it.description && (
                      <div className="text-ui-fg-subtle text-xs">{it.description}</div>
                    )}
                  </Table.Cell>
                  <Table.Cell>{it.quantity}</Table.Cell>
                  <Table.Cell>{it.target_unit_price ?? "—"}</Table.Cell>
                  <Table.Cell>
                    {isOpen ? (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={drafts[it.id]?.unit_price ?? ""}
                        onChange={(e) =>
                          setDrafts((d) => ({
                            ...d,
                            [it.id]: { ...d[it.id], unit_price: e.target.value },
                          }))
                        }
                      />
                    ) : (
                      <span>{it.unit_price ?? "—"}</span>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    {isOpen ? (
                      <Input
                        type="number"
                        min="0"
                        value={drafts[it.id]?.lead_time_days ?? ""}
                        onChange={(e) =>
                          setDrafts((d) => ({
                            ...d,
                            [it.id]: { ...d[it.id], lead_time_days: e.target.value },
                          }))
                        }
                      />
                    ) : (
                      <span>{it.lead_time_days ?? "—"}</span>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <span className="font-medium">
                      {price > 0 ? (price * it.quantity).toFixed(2) : "—"}
                    </span>
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table>
        {isOpen && (
          <div className="grid grid-cols-2 gap-4 px-6 py-4">
            <div>
              <Text size="small" className="text-ui-fg-subtle mb-1">
                Notes for buyer
              </Text>
              <Textarea
                rows={3}
                placeholder="e.g. FOB Frankfurt, payment terms net 30…"
                value={sellerNotes}
                onChange={(e) => setSellerNotes(e.target.value)}
              />
            </div>
            <div>
              <Text size="small" className="text-ui-fg-subtle mb-1">
                Valid for (days)
              </Text>
              <Input
                type="number"
                min="1"
                value={validForDays}
                onChange={(e) => setValidForDays(e.target.value)}
              />
              <div className="mt-3 text-sm">
                <Text className="text-ui-fg-subtle text-xs uppercase">Total</Text>
                <div className="font-semibold">
                  {computedTotal.toFixed(2)} {quote.currency_code.toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        )}
        {isOpen && (
          <div className="flex items-center justify-end gap-x-2 px-6 py-4">
            {error && (
              <Text size="small" className="text-ui-fg-error">
                {error}
              </Text>
            )}
            <Button onClick={submit} disabled={submitting || computedTotal <= 0}>
              {submitting ? "Submitting…" : "Submit quote"}
            </Button>
          </div>
        )}
      </Container>
    </div>
  )
}

export default VendorQuoteDetailPage
