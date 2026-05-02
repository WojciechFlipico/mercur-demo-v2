"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { getToken, onAuthChange } from "@/lib/auth"

type Notif = {
  id: string
  kind: string
  title: string
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

export default function Bell() {
  const [items, setItems] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  const refresh = useCallback(() => {
    if (!getToken()) {
      setItems([])
      setUnread(0)
      return
    }
    api
      .listNotifications()
      .then((d) => {
        setItems(d.notifications)
        setUnread(d.unread)
      })
      .catch(() => {
        setItems([])
        setUnread(0)
      })
  }, [])

  useEffect(() => {
    refresh()
    const onAuth = () => refresh()
    const off = onAuthChange(onAuth)
    const i = setInterval(refresh, 30_000)
    return () => {
      off()
      clearInterval(i)
    }
  }, [refresh])

  // Click outside to close
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener("mousedown", handler)
    return () => window.removeEventListener("mousedown", handler)
  }, [open])

  const onClickItem = async (n: Notif) => {
    if (!n.read_at) {
      api.markNotificationRead(n.id).catch(() => {})
      setItems((arr) => arr.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)))
      setUnread((u) => Math.max(0, u - 1))
    }
    setOpen(false)
  }

  if (!getToken()) return null

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        style={{
          position: "relative",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "4px 10px",
          cursor: "pointer",
          color: "var(--text)",
          fontSize: 14,
        }}
      >
        🔔
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              background: "var(--danger)",
              color: "white",
              fontSize: 10,
              fontWeight: 700,
              borderRadius: 999,
              minWidth: 16,
              height: 16,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
            }}
          >
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: 360,
            maxHeight: 480,
            overflowY: "auto",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            zIndex: 50,
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--border)",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Notifications
          </div>
          {items.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              Nothing yet.
            </div>
          ) : (
            items.map((n) => {
              const inner = (
                <div
                  onClick={() => onClickItem(n)}
                  style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    background: n.read_at ? "transparent" : "rgba(37,99,235,0.04)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {!n.read_at && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "var(--accent)",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</div>
                  </div>
                  {n.body && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                      {n.body}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              )
              return n.link ? (
                <Link key={n.id} href={n.link} style={{ color: "inherit", textDecoration: "none" }}>
                  {inner}
                </Link>
              ) : (
                <div key={n.id}>{inner}</div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
