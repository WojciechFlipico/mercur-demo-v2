// Tiny API client for the buyer storefront.
// Talks to the Mercur backend at NEXT_PUBLIC_API_URL with the publishable key.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY ?? ""

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  }
  if (PUBLISHABLE_KEY) {
    headers["x-publishable-api-key"] = PUBLISHABLE_KEY
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
  return (await res.json()) as T
}

// Types mirrored from the backend modules.
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

export const api = {
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

  listMyQuotes: (buyerEmail: string) =>
    request<{ quotes: Quote[]; count: number }>(
      `/store/quotes?buyer_email=${encodeURIComponent(buyerEmail)}`
    ),

  getQuote: (id: string) =>
    request<{ quote: Quote }>(`/store/quotes/${id}`),

  acceptQuote: (
    id: string,
    body: { milestones?: Array<{ label: string; percentage: number }> } = {}
  ) =>
    request<{ quote_id: string; invoice: Invoice; milestones: Milestone[] }>(
      `/store/quotes/${id}/accept`,
      { method: "POST", body: JSON.stringify(body) }
    ),
}
