import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { Container, Heading, Badge, Table, Text, Input, Button } from "@medusajs/ui"
import { Sparkles } from "@medusajs/icons"

export const config: RouteConfig = {
  label: "Audit log",
  icon: Sparkles,
}

export const handle = {
  breadcrumb: () => "Audit log",
}

declare const __BACKEND_URL__: string

type Entry = {
  id: string
  action: string
  resource_type: string
  resource_id: string
  actor_type: string
  actor_id: string | null
  actor_label: string | null
  payload: Record<string, unknown> | null
  created_at: string
}

const actionColor = (action: string): "grey" | "blue" | "orange" | "green" | "red" => {
  if (action.endsWith(".created") || action.endsWith(".invited")) return "blue"
  if (action.endsWith(".paid") || action.endsWith(".approved") || action.endsWith(".accepted")) return "green"
  if (action.endsWith(".rejected") || action.endsWith(".removed")) return "red"
  if (action.endsWith(".approval_requested") || action.endsWith(".responded") || action.endsWith(".updated")) return "orange"
  return "grey"
}

const AuditLogPage = () => {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ resource_type: "", action: "" })

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter.resource_type) params.set("resource_type", filter.resource_type)
    if (filter.action) params.set("action", filter.action)
    const qs = params.toString() ? `?${params.toString()}` : ""
    fetch(`${__BACKEND_URL__}/admin/audit-logs${qs}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading>Audit log</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {loading ? "Loading…" : `${entries.length} entr${entries.length === 1 ? "y" : "ies"}`}
        </Text>
      </div>
      <div className="flex items-center gap-x-2 px-6 py-3">
        <Input
          placeholder="resource_type (e.g. quote)"
          value={filter.resource_type}
          onChange={(e) => setFilter((f) => ({ ...f, resource_type: e.target.value }))}
          style={{ maxWidth: 200 }}
        />
        <Input
          placeholder="action (e.g. quote.accepted)"
          value={filter.action}
          onChange={(e) => setFilter((f) => ({ ...f, action: e.target.value }))}
          style={{ maxWidth: 240 }}
        />
        <Button variant="secondary" size="small" onClick={load}>
          Filter
        </Button>
        {(filter.resource_type || filter.action) && (
          <Button
            variant="transparent"
            size="small"
            onClick={() => {
              setFilter({ resource_type: "", action: "" })
              setTimeout(load, 0)
            }}
          >
            Reset
          </Button>
        )}
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Time</Table.HeaderCell>
            <Table.HeaderCell>Action</Table.HeaderCell>
            <Table.HeaderCell>Resource</Table.HeaderCell>
            <Table.HeaderCell>Actor</Table.HeaderCell>
            <Table.HeaderCell>Payload</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {entries.map((e) => (
            <Table.Row key={e.id}>
              <Table.Cell>
                <span className="text-xs text-ui-fg-subtle">
                  {new Date(e.created_at).toLocaleString()}
                </span>
              </Table.Cell>
              <Table.Cell>
                <Badge color={actionColor(e.action)} size="2xsmall">
                  {e.action}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <div className="text-xs">
                  <div className="font-medium">{e.resource_type}</div>
                  <code className="text-ui-fg-subtle">{e.resource_id}</code>
                </div>
              </Table.Cell>
              <Table.Cell>
                <div className="text-xs">
                  <Badge size="2xsmall">{e.actor_type}</Badge>
                  {e.actor_id && (
                    <div className="mt-0.5">
                      <code>{e.actor_id}</code>
                    </div>
                  )}
                </div>
              </Table.Cell>
              <Table.Cell>
                <pre style={{
                  margin: 0,
                  fontSize: 11,
                  maxWidth: 380,
                  whiteSpace: "pre-wrap",
                  color: "var(--text-muted)",
                }}>
                  {e.payload ? JSON.stringify(e.payload) : ""}
                </pre>
              </Table.Cell>
            </Table.Row>
          ))}
          {!loading && entries.length === 0 && (
            <Table.Row>
              <Table.Cell>
                <Text className="text-ui-fg-subtle py-8">No audit entries.</Text>
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table>
    </Container>
  )
}

export default AuditLogPage
