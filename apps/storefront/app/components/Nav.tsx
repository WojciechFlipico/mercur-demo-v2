"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getToken, onAuthChange, setToken } from "@/lib/auth"
import { api, type Me } from "@/lib/api"

export default function Nav() {
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [loaded, setLoaded] = useState(false)

  const refresh = () => {
    if (!getToken()) {
      setMe(null)
      setLoaded(true)
      return
    }
    api
      .me()
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setLoaded(true))
  }

  useEffect(() => {
    refresh()
    return onAuthChange(refresh)
  }, [])

  const onLogout = () => {
    setToken(null)
    router.push("/")
  }

  return (
    <nav>
      <Link href="/rfq/new">New RFQ</Link>
      <Link href="/rfq">My RFQs</Link>
      {me?.org && (
        <>
          <Link href="/team">Team</Link>
          {(me.member?.role === "admin" || me.member?.role === "approver") && (
            <Link href="/approvals">Approvals</Link>
          )}
        </>
      )}
      {loaded && !me && (
        <>
          <Link href="/login">Log in</Link>
          <Link href="/register">Register</Link>
        </>
      )}
      {me && (
        <>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
            {me.org?.name ?? "no org"} · {me.member?.role ?? "guest"}
          </span>
          <button
            onClick={onLogout}
            className="btn secondary"
            style={{ padding: "4px 12px", fontSize: 12 }}
          >
            Sign out
          </button>
        </>
      )}
    </nav>
  )
}
