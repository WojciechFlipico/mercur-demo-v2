// Dispatches to the right per-service start script based on
// RAILWAY_SERVICE_NAME (set automatically on Railway). Falls back to api.
import { spawn } from "node:child_process"

const service = (process.env.RAILWAY_SERVICE_NAME || "api").toLowerCase()
const target =
  service === "storefront" ? "start:storefront" : "start:api"

console.log(`[start] dispatching to "${target}" (RAILWAY_SERVICE_NAME=${service})`)

const child = spawn("bun", ["run", target], {
  stdio: "inherit",
  shell: false,
})

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
  } else {
    process.exit(code ?? 0)
  }
})
