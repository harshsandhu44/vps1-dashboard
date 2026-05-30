# VPS Dashboard

Minimal mobile-first dashboard for `vps1.harshsandhu.com`.

## Stack

- Next.js App Router, TypeScript, Server Components by default
- Tailwind CSS v4
- shadcn/ui with Radix primitives
- Recharts for the small client-side chart islands
- `geist` package fonts: Geist Sans, Geist Mono, and Geist Pixel

## Local Development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

If `METRICS_API_URL` or `METRICS_API_TOKEN` is missing, the dashboard renders demo data so the interface stays usable during local UI work.

## Metrics Agent

The agent is a dependency-free Node.js process for Linux VPS hosts. It reads `/proc`, samples CPU, memory, disk, network, uptime, and load average, then serves:

```bash
curl -H "Authorization: Bearer $METRICS_API_TOKEN" \
  http://127.0.0.1:4317/metrics
```

Run locally on the VPS:

```bash
METRICS_API_TOKEN="replace-with-a-long-random-token" pnpm agent
```

Production service examples live in `agent/`:

- `vps-agent.service`
- `cloudflared-tunnel.yml.example`

## Environment

Vercel needs these server-side variables:

```bash
METRICS_API_URL=https://vps1-metrics.harshsandhu.com/metrics
METRICS_API_TOKEN=replace-with-a-long-random-token
CF_ACCESS_CLIENT_ID=...
CF_ACCESS_CLIENT_SECRET=...
```

See `docs/deploy.md` for Vercel, Cloudflare DNS, Cloudflare Access, and Cloudflare Tunnel steps.
