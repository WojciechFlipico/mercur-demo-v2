import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { Container, Heading, Badge, Table, Text } from "@medusajs/ui"

export const config: RouteConfig = {
  label: "Invoice",
  nested: "/invoices",
}

export const handle = {
  breadcrumb: () => "Invoice details",
}

declare const __BACKEND_URL__: string

type Milestone = {
  id: string
  label: string
  sequence: number
  percentage: number
  amount: number
  currency_code: string
  status: string
  due_at: string | null
  paid_at: string | null
}
type Invoice = {
  id: string
  invoice_number: string
  seller_id: string | null
  buyer_email: string
  buyer_name: string | null
  buyer_company: string | null
  amount_due: number
  amount_paid: number
  currency_code: string
  status: string
  issued_at: string | null
  due_at: string | null
  paid_at: string | null
  notes: string | null
  milestones: Milestone[]
}

const milestoneColor: Record<string, "grey" | "blue" | "green" | "orange"> = {
  pending: "grey",
  due: "orange",
  paid: "green",
  cancelled: "grey",
}

const InvoiceDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(`${__BACKEND_URL__}/admin/invoices/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setInvoice(d.invoice))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Container className="p-6">Loading…</Container>
  if (!invoice) return <Container className="p-6">Not found</Container>

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading>{invoice.invoice_number}</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {invoice.id}
            </Text>
          </div>
          <Badge size="base">{invoice.status}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-x-6 gap-y-4 px-6 py-4 text-sm">
          <div>
            <Text className="text-ui-fg-subtle text-xs uppercase">Buyer</Text>
            <div>{invoice.buyer_company ?? "—"}</div>
            <div>{invoice.buyer_name ?? "—"}</div>
            <div className="text-ui-fg-subtle">{invoice.buyer_email}</div>
          </div>
          <div>
            <Text className="text-ui-fg-subtle text-xs uppercase">Seller</Text>
            <div><code>{invoice.seller_id ?? "—"}</code></div>
          </div>
          <div>
            <Text className="text-ui-fg-subtle text-xs uppercase">Amount</Text>
            <div className="font-semibold">
              {invoice.amount_paid} / {invoice.amount_due} {invoice.currency_code.toUpperCase()}
            </div>
            {invoice.due_at && (
              <Text size="xsmall" className="text-ui-fg-subtle">
                Due {new Date(invoice.due_at).toLocaleDateString()}
              </Text>
            )}
            {invoice.paid_at && (
              <Text size="xsmall" className="text-ui-fg-subtle">
                Paid {new Date(invoice.paid_at).toLocaleDateString()}
              </Text>
            )}
          </div>
        </div>
      </Container>

      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Payment milestones</Heading>
        </div>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>#</Table.HeaderCell>
              <Table.HeaderCell>Label</Table.HeaderCell>
              <Table.HeaderCell>%</Table.HeaderCell>
              <Table.HeaderCell>Amount</Table.HeaderCell>
              <Table.HeaderCell>Due</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Paid at</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {invoice.milestones.map((m) => (
              <Table.Row key={m.id}>
                <Table.Cell>{m.sequence + 1}</Table.Cell>
                <Table.Cell>{m.label}</Table.Cell>
                <Table.Cell>{m.percentage}%</Table.Cell>
                <Table.Cell>
                  {m.amount} {m.currency_code.toUpperCase()}
                </Table.Cell>
                <Table.Cell>
                  {m.due_at ? new Date(m.due_at).toLocaleDateString() : "—"}
                </Table.Cell>
                <Table.Cell>
                  <Badge color={milestoneColor[m.status] ?? "grey"} size="2xsmall">
                    {m.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <span className="text-ui-fg-subtle text-xs">
                    {m.paid_at ? new Date(m.paid_at).toLocaleString() : "—"}
                  </span>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Container>
    </div>
  )
}

export default InvoiceDetailPage
