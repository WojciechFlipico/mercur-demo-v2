// Tiny API client for the buyer storefront.
// Talks to the Mercur backend at NEXT_PUBLIC_API_URL with the publishable key.

import { getToken } from "./auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY ?? ""

async function request<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  }
  if (PUBLISHABLE_KEY) {
    headers["x-publishable-api-key"] = PUBLISHABLE_KEY
  }
  if (init.auth !== false) {
    const t = getToken()
    if (t) headers["Authorization"] = `Bearer ${t}`
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${text}`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// === Auth ===
export type AuthToken = { token: string }
export const auth = {
  register: (body: { email: string; password: string }) =>
    request<AuthToken>("/auth/customer/emailpass/register", {
      method: "POST",
      auth: false,
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    request<AuthToken>("/auth/customer/emailpass", {
      method: "POST",
      auth: false,
      body: JSON.stringify(body),
    }),
  createCustomer: (body: { email: string; first_name?: string; last_name?: string }) =>
    request<{ customer: { id: string; email: string } }>("/store/customers", {
      method: "POST",
      body: JSON.stringify(body),
    }),
}

// === Quote types ===
export type QuoteItemDraft = {
  title: string
  description?: string
  quantity: number
  target_unit_price?: number
  notes?: string
}

export type QuoteItem = {
  id: string
  title: string
  description: string | null
  quantity: number
  target_unit_price: number | null
  unit_price: number | null
  lead_time_days: number | null
  notes: string | null
}

export type Quote = {
  id: string
  buyer_email: string
  buyer_name: string | null
  buyer_company: string | null
  status: "requested" | "quoted" | "accepted" | "rejected" | "expired"
  seller_id: string | null
  total_amount: number | null
  currency_code: string
  notes: string | null
  seller_notes: string | null
  valid_until: string | null
  responded_at: string | null
  accepted_at: string | null
  created_at: string
  buyer_org_id: string | null
  approval_status: "not_required" | "pending" | "approved" | "rejected"
  approval_requested_at: string | null
  approved_by_customer_id: string | null
  approved_at: string | null
  approval_note: string | null
  items: QuoteItem[]
}

export type Milestone = {
  id: string
  label: string
  sequence: number
  percentage: number
  amount: number
  currency_code: string
  status: "pending" | "due" | "paid" | "cancelled"
  due_at: string | null
  paid_at: string | null
}

export type Invoice = {
  id: string
  invoice_number: string
  amount_due: number
  amount_paid: number
  currency_code: string
  status: string
  issued_at: string | null
  due_at: string | null
  paid_at: string | null
}

// === Buyer org types ===
export type BuyerRole = "admin" | "approver" | "buyer"

export type BuyerMember = {
  id: string
  org_id: string
  customer_id: string | null
  email: string
  name: string | null
  role: BuyerRole
  approval_limit: number | null
}

export type BuyerOrg = {
  id: string
  name: string
  owner_customer_id: string
  approval_threshold: number | null
  currency_code: string
  notes: string | null
  members?: BuyerMember[]
}

export type Me = {
  customer_id: string
  org: (BuyerOrg & { members: BuyerMember[] }) | null
  member: BuyerMember | null
}

// === API surface ===
export const api = {
  // Quotes
  createQuote: (body: {
    buyer_email: string
    buyer_name?: string
    buyer_company?: string
    notes?: string
    currency_code?: string
    items: QuoteItemDraft[]
  }) =>
    request<{ quote: Quote }>("/store/quotes", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listMyQuotes: (buyerEmail?: string) => {
    const path =
      buyerEmail
        ? `/store/quotes?buyer_email=${encodeURIComponent(buyerEmail)}`
        : `/store/quotes`
    return request<{ quotes: Quote[]; count: number }>(path)
  },

  getQuote: (id: string) => request<{ quote: Quote }>(`/store/quotes/${id}`),

  acceptQuote: (id: string) =>
    request<
      | { quote_id: string; invoice: Invoice; milestones: Milestone[]; approval_required: false }
      | { quote: Quote; approval_required: true; message: string }
    >(`/store/quotes/${id}/accept`, { method: "POST", body: "{}" }),

  // Approvals
  pendingApprovals: () =>
    request<{ quotes: Quote[]; count: number }>(`/store/buyer-orgs/me/approvals`),
  approveQuote: (
    id: string,
    body: { decision: "approve" | "reject"; note?: string }
  ) =>
    request<{ quote_id: string; invoice: Invoice; milestones: Milestone[] } | { quote: Quote }>(
      `/store/quotes/${id}/approve`,
      { method: "POST", body: JSON.stringify(body) }
    ),

  // Buyer orgs
  me: () => request<Me>("/store/buyer-orgs/me"),
  createOrg: (body: {
    name: string
    approval_threshold?: number
    currency_code?: string
    notes?: string
  }) => request<{ org: BuyerOrg }>("/store/buyer-orgs", {
    method: "POST",
    body: JSON.stringify(body),
  }),
  listMembers: (orgId: string) =>
    request<{ members: BuyerMember[]; count: number }>(
      `/store/buyer-orgs/${orgId}/members`
    ),
  inviteMember: (
    orgId: string,
    body: { email: string; name?: string; role?: BuyerRole; approval_limit?: number }
  ) =>
    request<{ member: BuyerMember }>(`/store/buyer-orgs/${orgId}/members`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateMember: (
    orgId: string,
    memberId: string,
    body: { role?: BuyerRole; approval_limit?: number | null; name?: string }
  ) =>
    request<{ member: BuyerMember }>(
      `/store/buyer-orgs/${orgId}/members/${memberId}`,
      { method: "PATCH", body: JSON.stringify(body) }
    ),
  removeMember: (orgId: string, memberId: string) =>
    request<{ id: string; deleted: boolean }>(
      `/store/buyer-orgs/${orgId}/members/${memberId}`,
      { method: "DELETE" }
    ),
}
