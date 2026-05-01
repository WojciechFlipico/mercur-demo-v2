"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { api, type BuyerMember, type BuyerRole, type Me } from "@/lib/api"

export default function TeamPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [members, setMembers] = useState<BuyerMember[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteName, setInviteName] = useState("")
  const [inviteRole, setInviteRole] = useState<BuyerRole>("buyer")
  const [inviteLimit, setInviteLimit] = useState("")
  const [inviting, setInviting] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const m = await api.me()
      setMe(m)
      if (m.org) {
        const r = await api.listMembers(m.org.id)
        setMembers(r.members)
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!me?.org) return
    setInviting(true)
    setErr(null)
    try {
      await api.inviteMember(me.org.id, {
        email: inviteEmail.trim(),
        name: inviteName || undefined,
        role: inviteRole,
        approval_limit: inviteLimit ? Number(inviteLimit) : undefined,
      })
      setInviteEmail("")
      setInviteName("")
      setInviteRole("buyer")
      setInviteLimit("")
      refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setInviting(false)
    }
  }

  const onChangeRole = async (member: BuyerMember, role: BuyerRole) => {
    if (!me?.org) return
    try {
      await api.updateMember(me.org.id, member.id, { role })
      refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    }
  }

  const onChangeLimit = async (member: BuyerMember, limit: string) => {
    if (!me?.org) return
    const v = limit.trim() === "" ? null : Number(limit)
    try {
      await api.updateMember(me.org.id, member.id, { approval_limit: v })
      refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    }
  }

  const onRemove = async (member: BuyerMember) => {
    if (!me?.org) return
    if (!confirm(`Remove ${member.email}?`)) return
    await api.removeMember(me.org.id, member.id)
    refresh()
  }

  if (loading) return <div className="card">Loading…</div>
  if (!me) return <div className="card">Please <Link href="/login">log in</Link>.</div>
  if (!me.org)
    return (
      <div className="card">
        <h1>No organization</h1>
        <p className="muted">
          You&rsquo;re not part of any procurement org yet. <Link href="/register">Create one</Link>.
        </p>
      </div>
    )

  const isAdmin = me.member?.role === "admin"

  return (
    <div>
      <div className="card">
        <h1>{me.org.name}</h1>
        <div className="kvs" style={{ marginTop: 16 }}>
          <div>
            <div className="kv-label">Approval threshold</div>
            <div className="kv-value">
              {me.org.approval_threshold != null
                ? `${me.org.approval_threshold} ${me.org.currency_code.toUpperCase()}`
                : "None — any member can accept any amount"}
            </div>
          </div>
          <div>
            <div className="kv-label">Your role</div>
            <div className="kv-value">{me.member?.role}</div>
          </div>
          <div>
            <div className="kv-label">Your personal limit</div>
            <div className="kv-value">
              {me.member?.approval_limit != null
                ? `${me.member.approval_limit} ${me.org.currency_code.toUpperCase()}`
                : "—"}
            </div>
          </div>
        </div>
      </div>

      {err && <div className="alert alert-error">{err}</div>}

      <div className="card">
        <div className="flex-between">
          <h2 style={{ margin: 0 }}>Members</h2>
          <span className="muted">{members.length} total</span>
        </div>
        <table style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Approval limit</th>
              <th>Linked customer</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.email}</td>
                <td>{m.name ?? "—"}</td>
                <td>
                  {isAdmin && m.id !== me.member?.id ? (
                    <select
                      value={m.role}
                      onChange={(e) => onChangeRole(m, e.target.value as BuyerRole)}
                    >
                      <option value="buyer">buyer</option>
                      <option value="approver">approver</option>
                      <option value="admin">admin</option>
                    </select>
                  ) : (
                    <span className={`badge badge-${m.role === "admin" ? "blue" : m.role === "approver" ? "orange" : "grey"}`}>
                      {m.role}
                    </span>
                  )}
                </td>
                <td>
                  {isAdmin && m.id !== me.member?.id ? (
                    <input
                      type="number"
                      min={0}
                      defaultValue={m.approval_limit ?? ""}
                      placeholder="—"
                      style={{ width: 110 }}
                      onBlur={(e) =>
                        e.target.value !== (m.approval_limit?.toString() ?? "") &&
                        onChangeLimit(m, e.target.value)
                      }
                    />
                  ) : (
                    <span>{m.approval_limit ?? "—"}</span>
                  )}
                </td>
                <td>
                  {m.customer_id ? (
                    <code style={{ fontSize: 11 }}>{m.customer_id}</code>
                  ) : (
                    <span className="muted">pending registration</span>
                  )}
                </td>
                {isAdmin && (
                  <td>
                    {m.id !== me.member?.id && (
                      <button
                        onClick={() => onRemove(m)}
                        className="btn secondary"
                        style={{ padding: "4px 10px", fontSize: 12 }}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdmin && (
        <form onSubmit={onInvite} className="card">
          <h2 style={{ marginTop: 0 }}>Invite a member</h2>
          <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
            They&rsquo;ll register on this same email; the membership links automatically once their customer record exists.
          </p>
          <div className="row">
            <div>
              <label>Email *</label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <label>Name</label>
              <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
            </div>
          </div>
          <div className="row">
            <div>
              <label>Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as BuyerRole)}
              >
                <option value="buyer">Buyer (raises RFQs, escalates above limit)</option>
                <option value="approver">Approver (reviews escalated quotes)</option>
                <option value="admin">Admin (full control)</option>
              </select>
            </div>
            <div>
              <label>Personal approval limit (optional)</label>
              <input
                type="number"
                min={0}
                value={inviteLimit}
                onChange={(e) => setInviteLimit(e.target.value)}
                placeholder="overrides org threshold"
              />
            </div>
          </div>
          <button type="submit" className="btn" disabled={inviting}>
            {inviting ? "Inviting…" : "Add member"}
          </button>
        </form>
      )}
    </div>
  )
}
