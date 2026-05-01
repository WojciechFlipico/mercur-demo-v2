// Tiny client-side auth state for the buyer storefront. Token stored in
// localStorage; consumers re-render when it changes via window event.

const TOKEN_KEY = "buyerToken"
const EVT = "buyerAuthChanged"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
  window.dispatchEvent(new Event(EVT))
}

export function onAuthChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  window.addEventListener(EVT, cb)
  window.addEventListener("storage", cb)
  return () => {
    window.removeEventListener(EVT, cb)
    window.removeEventListener("storage", cb)
  }
}
