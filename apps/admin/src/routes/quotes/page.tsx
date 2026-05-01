import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { Container, Heading, Badge, Table, Text } from "@medusajs/ui"
import { DocumentText } from "@medusajs/icons"

export const config: RouteConfig = {
  label: "Quotes (RFQ)",
  icon: DocumentText,
}

export const handle = {
  breadcrumb: () => "Quotes",
}

declare const __BACKEND_URL__: string

type Quote = {
  id: string
  buyer_email: string
  buyer_company: string | null
  status: string
  seller_id: string | null
  total_amount: number | null
  currency_code: string
  created_at: string
  items: Array<{ id: string; title: string; quantity: number }>
}

const statusColor: Record<string, "grey" | "blue" | "green" | "red" | "orange"> = {
  requested: "blue",
  quoted: "orange",
  accepted: "green",
  rejected: "red",
  expired: "grey",
}

const QuotesPage = () => {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${__BACKEND_URL__}/admin/quotes`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setQuotes(d.quotes ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading>Requests for Quotation</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {loading ? "Loading…" : `${quotes.length} total`}
        </Text>
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>ID</Table.HeaderCell>
            <Table.HeaderCell>Buyer</Table.HeaderCell>
            <Table.HeaderCell>Items</Table.HeaderCell>
            <Table.HeaderCell>Total</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Created</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {quotes.map((q) => (
            <Table.Row key={q.id}>
              <Table.Cell>
                <Link to={`/quotes/${q.id}`} className="text-ui-fg-interactive">
                  {q.id.slice(0, 18)}…
                </Link>
              </Table.Cell>
              <Table.Cell>
                <div>
                  <div className="font-medium">{q.buyer_company ?? "—"}</div>
                  <div className="text-ui-fg-subtle text-xs">{q.buyer_email}</div>
                </div>
              </Table.Cell>
              <Table.Cell>{q.items?.length ?? 0}</Table.Cell>
              <Table.Cell>
                {q.total_amount != null
                  ? `${q.total_amount} ${q.currency_code.toUpperCase()}`
                  : "—"}
              </Table.Cell>
              <Table.Cell>
                <Badge color={statusColor[q.status] ?? "grey"} size="2xsmall">
                  {q.status}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <span className="text-ui-fg-subtle text-xs">
                  {new Date(q.created_at).toLocaleString()}
                </span>
              </Table.Cell>
            </Table.Row>
          ))}
          {!loading && quotes.length === 0 && (
            <Table.Row>
              <Table.Cell>
                <Text className="text-ui-fg-subtle py-8">
                  No RFQs yet. Use POST /store/quotes to create one.
                </Text>
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table>
    </Container>
  )
}

export default QuotesPage
