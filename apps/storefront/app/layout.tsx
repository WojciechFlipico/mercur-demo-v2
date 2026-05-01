import type { Metadata } from "next"
import Link from "next/link"
import Nav from "./components/Nav"
import "./globals.css"

export const metadata: Metadata = {
  title: "Mercur B2B Demo · Buyer Portal",
  description: "Submit RFQs, review supplier quotes, and accept them.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <div className="container">
            <Link href="/" className="brand">
              Mercur B2B · Buyer Portal
            </Link>
            <Nav />
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="footer">
          <div className="container">
            Built on Mercur 2.1 + MedusaJS · Demo only
          </div>
        </footer>
      </body>
    </html>
  )
}
