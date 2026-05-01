import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { Container, Heading, Badge, Table, Text } from "@medusajs/ui"

export const config: RouteConfig = {
  label: "Quote",
  nested: "/quotes",
}

export const handle = {
  breadcrumb: () => "Quote details",
}

declare const __BACKEND_URL__: string

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
  responded_at: string | null
  accepted_at: string | null
  created_at: string
  items: QuoteItem[]
}

const QuoteDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`${__BACKEND_URL__}/admin/quotes/${id}`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      })
      .then((d) => setQuote(d.quote))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Container className="p-6">Loading…</Container>
  if (error) return <Container className="p-6 text-ui-fg-error">{error}</Container>
  if (!quote) return <Container className="p-6">Not found</Container>

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading>{quote.id}</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Created {new Date(quote.created_at).toLocaleString()}
            </Text>
          </div>
          <Badge size="base">{quote.status}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-6 py-4 text-sm">
          <div>
            <Text className="text-ui-fg-subtle text-xs uppercase">Buyer</Text>
            <div>{quote.buyer_company ?? "—"}</div>
            <div>{quote.buyer_name ?? "—"}</div>
            <div className="text-ui-fg-subtle">{quote.buyer_email}</div>
          </div>
          <div>
            <Text className="text-ui-fg-subtle text-xs uppercase">Seller</Text>
            <div>{quote.seller_id ?? "—"}</div>
            <Text className="text-ui-fg-subtle text-xs uppercase mt-3">Total</Text>
            <div className="font-semibold">
              {quote.total_amount != null
                ? `${quote.total_amount} ${quote.currency_code.toUpperCase()}`
                : "Not yet quoted"}
            </div>
            {quote.valid_until && (
              <Text size="xsmall" className="text-ui-fg-subtle">
                Valid until {new Date(quote.valid_until).toLocaleDateString()}
              </Text>
            )}
          </div>
          {quote.notes && (
            <div className="col-span-2">
              <Text className="text-ui-fg-subtle text-xs uppercase">Buyer notes</Text>
              <div>{quote.notes}</div>
            </div>
          )}
          {quote.seller_notes && (
            <div className="col-span-2">
              <Text className="text-ui-fg-subtle text-xs uppercase">Seller notes</Text>
              <div>{quote.seller_notes}</div>
            </div>
          )}
        </div>
      </Container>

      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Items</Heading>
        </div>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Title</Table.HeaderCell>
              <Table.HeaderCell>Qty</Table.HeaderCell>
              <Table.HeaderCell>Target unit</Table.HeaderCell>
              <Table.HeaderCell>Quoted unit</Table.HeaderCell>
              <Table.HeaderCell>Line total</Table.HeaderCell>
              <Table.HeaderCell>Lead time</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {quote.items.map((it) => (
              <Table.Row key={it.id}>
                <Table.Cell>
                  <div className="font-medium">{it.title}</div>
                  {it.description && (
                    <div className="text-ui-fg-subtle text-xs">{it.description}</div>
                  )}
                </Table.Cell>
                <Table.Cell>{it.quantity}</Table.Cell>
                <Table.Cell>{it.target_unit_price ?? "—"}</Table.Cell>
                <Table.Cell>{it.unit_price ?? "—"}</Table.Cell>
                <Table.Cell>
                  {it.unit_price != null ? Number(it.unit_price) * it.quantity : "—"}
                </Table.Cell>
                <Table.Cell>
                  {it.lead_time_days != null ? `${it.lead_time_days} d` : "—"}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Container>
    </div>
  )
}

export default QuoteDetailPage
