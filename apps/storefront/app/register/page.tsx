"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { auth, api } from "@/lib/api"
import { setToken } from "@/lib/auth"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [orgName, setOrgName] = useState("")
  const [threshold, setThreshold] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      // 1) auth identity
      await auth.register({ email, password })
      // 2) login to get token tied to the new identity
      const { token: t1 } = await auth.login({ email, password })
      setToken(t1)
      // 3) create the customer record (uses the token we just stored)
      await auth.createCustomer({ email, first_name: firstName || undefined, last_name: lastName || undefined })
      // 4) re-login: token now carries actor_id = customer_id
      const { token: t2 } = await auth.login({ email, password })
      setToken(t2)
      // 5) optional org bootstrap
      if (orgName.trim()) {
        await api.createOrg({
          name: orgName.trim(),
          approval_threshold: threshold ? Number(threshold) : undefined,
        })
      }
      router.push(orgName.trim() ? "/team" : "/rfq")
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card" onSubmit={onSubmit} style={{ maxWidth: 600 }}>
      <h1>Create account</h1>
      <p className="muted">
        Sign up as a buyer. You can also create your procurement org in one go —
        you become its admin.
      </p>
      {err && <div className="alert alert-error">{err}</div>}
      <h2 style={{ marginTop: 24 }}>You</h2>
      <div className="row">
        <div>
          <label>Email *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label>Password *</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>
      <div className="row">
        <div>
          <label>First name</label>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div>
          <label>Last name</label>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
      </div>

      <h2 style={{ marginTop: 24 }}>Procurement org (optional)</h2>
      <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
        Leave empty to join an existing org later.
      </p>
      <div className="row">
        <div>
          <label>Org name</label>
          <input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="e.g. ACME Procurement"
          />
        </div>
        <div>
          <label>Approval threshold (any currency)</label>
          <input
            type="number"
            min={0}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="e.g. 10000"
          />
        </div>
      </div>

      <button type="submit" className="btn" disabled={busy}>
        {busy ? "Creating account…" : "Create account"}
      </button>
      <p className="muted" style={{ marginTop: 16, fontSize: 12 }}>
        Already have one? <Link href="/login">Sign in</Link>.
      </p>
    </form>
  )
}
