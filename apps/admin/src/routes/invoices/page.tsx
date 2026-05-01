import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { Container, Heading, Badge, Table, Text } from "@medusajs/ui"
import { ReceiptPercent } from "@medusajs/icons"

export const config: RouteConfig = {
  label: "Invoices",
  icon: ReceiptPercent,
}

export const handle = {
  breadcrumb: () => "Invoices",
}

declare const __BACKEND_URL__: string

type Milestone = {
  id: string
  label: string
  percentage: number
  amount: number
  status: string
  paid_at: string | null
}

type Invoice = {
  id: string
  invoice_number: string
  seller_id: string | null
  buyer_email: string
  buyer_company: string | null
  amount_due: number
  amount_paid: number
  currency_code: string
  status: string
  issued_at: string | null
  due_at: string | null
  paid_at: string | null
  created_at: string
  milestones: Milestone[]
}

const statusColor: Record<string, "grey" | "blue" | "green" | "red" | "orange"> = {
  draft: "grey",
  sent: "blue",
  paid: "green",
  overdue: "red",
  cancelled: "grey",
}

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${__BACKEND_URL__}/admin/invoices`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setInvoices(d.invoices ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading>Invoices</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {loading ? "Loading…" : `${invoices.length} total`}
        </Text>
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Number</Table.HeaderCell>
            <Table.HeaderCell>Buyer</Table.HeaderCell>
            <Table.HeaderCell>Seller</Table.HeaderCell>
            <Table.HeaderCell>Due / Paid</Table.HeaderCell>
            <Table.HeaderCell>Milestones</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Issued</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {invoices.map((inv) => {
            const paidMilestones = inv.milestones.filter((m) => m.status === "paid").length
            return (
              <Table.Row key={inv.id}>
                <Table.Cell>
                  <Link to={`/invoices/${inv.id}`} className="text-ui-fg-interactive">
                    {inv.invoice_number}
                  </Link>
                </Table.Cell>
                <Table.Cell>
                  <div className="font-medium">{inv.buyer_company ?? "—"}</div>
                  <div className="text-ui-fg-subtle text-xs">{inv.buyer_email}</div>
                </Table.Cell>
                <Table.Cell>
                  <code className="text-xs">{inv.seller_id ?? "—"}</code>
                </Table.Cell>
                <Table.Cell>
                  <div>
                    {inv.amount_paid} / {inv.amount_due} {inv.currency_code.toUpperCase()}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  {paidMilestones} / {inv.milestones.length} paid
                </Table.Cell>
                <Table.Cell>
                  <Badge color={statusColor[inv.status] ?? "grey"} size="2xsmall">
                    {inv.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <span className="text-ui-fg-subtle text-xs">
                    {inv.issued_at ? new Date(inv.issued_at).toLocaleDateString() : "—"}
                  </span>
                </Table.Cell>
              </Table.Row>
            )
          })}
          {!loading && invoices.length === 0 && (
            <Table.Row>
              <Table.Cell>
                <Text className="text-ui-fg-subtle py-8">
                  No invoices yet. Accept a quote in /quotes to generate one.
                </Text>
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table>
    </Container>
  )
}

export default InvoicesPage
