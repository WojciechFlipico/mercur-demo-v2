import Link from "next/link"

export default function Home() {
  return (
    <div className="card">
      <h1>Buyer Portal</h1>
      <p className="muted">
        Submit a Request For Quotation, get prices and lead times from suppliers,
        accept the best offer, and pay against milestones — all on a Mercur 2.1
        marketplace.
      </p>
      <div className="flex" style={{ marginTop: 24 }}>
        <Link href="/rfq/new" className="btn">
          Create new RFQ
        </Link>
        <Link href="/rfq" className="btn secondary">
          View my RFQs
        </Link>
      </div>

      <div style={{ marginTop: 48 }}>
        <h2>How it works</h2>
        <ol className="muted" style={{ lineHeight: 1.8 }}>
          <li>You submit an RFQ with the items, quantities, and target prices.</li>
          <li>A supplier reviews your request in their vendor panel and quotes back unit prices and lead times.</li>
          <li>You accept the quote — the platform issues an invoice and a payment milestone schedule (default 30% deposit / 70% on delivery).</li>
          <li>The supplier marks each milestone paid as it settles.</li>
        </ol>
      </div>
    </div>
  )
}
