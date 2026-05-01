import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { Container, Heading, Badge, Table, Text } from "@medusajs/ui"
import { DocumentText } from "@medusajs/icons"

export const config: RouteConfig = {
  label: "RFQs",
  icon: DocumentText,
}

export const handle = {
  breadcrumb: () => "RFQs",
}

declare const __BACKEND_URL__: string

// MVP-demo: hardcoded seller used by /b2b/* endpoints. In production this
// would come from the authenticated seller session.
const DEMO_SELLER_ID = "sel_demo"

type Quote = {
  id: string
  buyer_email: string
  buyer_company: string | null
  status: string
  total_amount: number | null
  currency_code: string
  responded_at: string | null
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

const VendorQuotesPage = () => {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${__BACKEND_URL__}/b2b/quotes`, {
      credentials: "include",
      headers: { "x-seller-id": DEMO_SELLER_ID },
    })
      .then((r) => r.json())
      .then((d) => setQuotes(d.quotes ?? []))
      .finally(() => setLoading(false))
  }, [])

  const open = quotes.filter((q) => q.status === "requested")
  const responded = quotes.filter((q) => q.status !== "requested")

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading>Open Requests for Quotation</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Buyers waiting for your response
            </Text>
          </div>
          <Text size="small" className="text-ui-fg-subtle">
            {loading ? "Loading…" : `${open.length} open`}
          </Text>
        </div>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>ID</Table.HeaderCell>
              <Table.HeaderCell>Buyer</Table.HeaderCell>
              <Table.HeaderCell>Items</Table.HeaderCell>
              <Table.HeaderCell>Currency</Table.HeaderCell>
              <Table.HeaderCell>Created</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {open.map((q) => (
              <Table.Row key={q.id}>
                <Table.Cell>
                  <code className="text-xs">{q.id.slice(0, 18)}…</code>
                </Table.Cell>
                <Table.Cell>
                  <div className="font-medium">{q.buyer_company ?? "—"}</div>
                  <div className="text-ui-fg-subtle text-xs">{q.buyer_email}</div>
                </Table.Cell>
                <Table.Cell>{q.items?.length ?? 0}</Table.Cell>
                <Table.Cell>{q.currency_code.toUpperCase()}</Table.Cell>
                <Table.Cell>
                  <span className="text-ui-fg-subtle text-xs">
                    {new Date(q.created_at).toLocaleString()}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <Link
                    to={`/quotes/${q.id}`}
                    className="text-ui-fg-interactive font-medium"
                  >
                    Quote it →
                  </Link>
                </Table.Cell>
              </Table.Row>
            ))}
            {!loading && open.length === 0 && (
              <Table.Row>
                <Table.Cell>
                  <Text className="text-ui-fg-subtle py-6">No open RFQs</Text>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </Container>

      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">My responded quotes</Heading>
        </div>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>ID</Table.HeaderCell>
              <Table.HeaderCell>Buyer</Table.HeaderCell>
              <Table.HeaderCell>Total</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Responded</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {responded.map((q) => (
              <Table.Row key={q.id}>
                <Table.Cell>
                  <Link to={`/quotes/${q.id}`} className="text-ui-fg-interactive">
                    {q.id.slice(0, 18)}…
                  </Link>
                </Table.Cell>
                <Table.Cell>{q.buyer_company ?? q.buyer_email}</Table.Cell>
                <Table.Cell>
                  {q.total_amount} {q.currency_code.toUpperCase()}
                </Table.Cell>
                <Table.Cell>
                  <Badge color={statusColor[q.status] ?? "grey"} size="2xsmall">
                    {q.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <span className="text-ui-fg-subtle text-xs">
                    {q.responded_at
                      ? new Date(q.responded_at).toLocaleDateString()
                      : "—"}
                  </span>
                </Table.Cell>
              </Table.Row>
            ))}
            {!loading && responded.length === 0 && (
              <Table.Row>
                <Table.Cell>
                  <Text className="text-ui-fg-subtle py-6">No responded quotes yet</Text>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </Container>
    </div>
  )
}

export default VendorQuotesPage
