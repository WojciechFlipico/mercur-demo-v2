import { useEffect, useState, useCallback } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { Container, Heading, Badge, Table, Text, Button } from "@medusajs/ui"
import { ReceiptPercent } from "@medusajs/icons"

export const config: RouteConfig = {
  label: "Invoices",
  icon: ReceiptPercent,
}

export const handle = {
  breadcrumb: () => "Invoices",
}

declare const __BACKEND_URL__: string
const DEMO_SELLER_ID = "sel_demo"

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
  buyer_email: string
  buyer_company: string | null
  amount_due: number
  amount_paid: number
  currency_code: string
  status: string
  issued_at: string | null
  due_at: string | null
  paid_at: string | null
  milestones: Milestone[]
}

const invoiceStatusColor: Record<string, "grey" | "blue" | "green" | "red" | "orange"> = {
  draft: "grey",
  sent: "blue",
  paid: "green",
  overdue: "red",
  cancelled: "grey",
}
const milestoneColor: Record<string, "grey" | "blue" | "green" | "orange"> = {
  pending: "grey",
  due: "orange",
  paid: "green",
  cancelled: "grey",
}

const VendorInvoicesPage = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch(`${__BACKEND_URL__}/b2b/invoices`, {
      credentials: "include",
      headers: { "x-seller-id": DEMO_SELLER_ID },
    })
      .then((r) => r.json())
      .then((d) => setInvoices(d.invoices ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const markPaid = async (milestoneId: string) => {
    setPaying(milestoneId)
    try {
      const res = await fetch(`${__BACKEND_URL__}/b2b/milestones/${milestoneId}/pay`, {
        method: "POST",
        credentials: "include",
        headers: { "x-seller-id": DEMO_SELLER_ID },
      })
      if (!res.ok) throw new Error(await res.text())
      load()
    } catch (e) {
      alert(`Failed: ${e}`)
    } finally {
      setPaying(null)
    }
  }

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading>My invoices</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Issued from accepted RFQs. Mark milestones paid as they settle.
            </Text>
          </div>
          <Text size="small" className="text-ui-fg-subtle">
            {loading ? "Loading…" : `${invoices.length} total`}
          </Text>
        </div>
      </Container>

      {invoices.map((inv) => {
        const totalPaid = inv.milestones.filter((m) => m.status === "paid").length
        return (
          <Container key={inv.id} className="divide-y p-0">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <div className="flex items-center gap-x-2">
                  <Heading level="h2">{inv.invoice_number}</Heading>
                  <Badge color={invoiceStatusColor[inv.status] ?? "grey"} size="2xsmall">
                    {inv.status}
                  </Badge>
                </div>
                <Text size="small" className="text-ui-fg-subtle">
                  {inv.buyer_company ?? "—"} · {inv.buyer_email}
                </Text>
              </div>
              <div className="text-right text-sm">
                <div className="font-semibold">
                  {inv.amount_paid} / {inv.amount_due} {inv.currency_code.toUpperCase()}
                </div>
                <div className="text-ui-fg-subtle text-xs">
                  {totalPaid} of {inv.milestones.length} paid
                </div>
              </div>
            </div>
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>#</Table.HeaderCell>
                  <Table.HeaderCell>Label</Table.HeaderCell>
                  <Table.HeaderCell>%</Table.HeaderCell>
                  <Table.HeaderCell>Amount</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Paid at</Table.HeaderCell>
                  <Table.HeaderCell />
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {inv.milestones.map((m) => (
                  <Table.Row key={m.id}>
                    <Table.Cell>{m.sequence + 1}</Table.Cell>
                    <Table.Cell>{m.label}</Table.Cell>
                    <Table.Cell>{m.percentage}%</Table.Cell>
                    <Table.Cell>
                      {m.amount} {m.currency_code.toUpperCase()}
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
                    <Table.Cell>
                      {m.status === "due" && (
                        <Button
                          size="small"
                          variant="secondary"
                          onClick={() => markPaid(m.id)}
                          disabled={paying === m.id}
                        >
                          {paying === m.id ? "Marking…" : "Mark paid"}
                        </Button>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Container>
        )
      })}

      {!loading && invoices.length === 0 && (
        <Container className="p-6">
          <Text className="text-ui-fg-subtle text-center">
            No invoices yet. They appear after a buyer accepts your quote.
          </Text>
        </Container>
      )}
    </div>
  )
}

export default VendorInvoicesPage
