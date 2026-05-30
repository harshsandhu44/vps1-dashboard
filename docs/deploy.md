# Deploying vps1.harshsandhu.com

## 1. Deploy the Dashboard to Vercel

1. Push this repo to GitHub.
2. Import the project in Vercel.
3. Set the production environment variables:
   - `METRICS_API_URL=https://vps1-metrics.harshsandhu.com/metrics`
   - `METRICS_API_TOKEN=<same long random token used by the agent>`
   - `CF_ACCESS_CLIENT_ID=<Cloudflare Access service token client id>`
   - `CF_ACCESS_CLIENT_SECRET=<Cloudflare Access service token secret>`
4. Add `vps1.harshsandhu.com` as the production domain in Vercel.
5. Run:

```bash
vercel domains inspect vps1.harshsandhu.com
```

Use the exact DNS target Vercel reports. For a subdomain it is commonly a CNAME target such as `cname.vercel-dns-0.com`, but Vercel can return project-specific values.

## 2. Configure Cloudflare DNS

Create a DNS record for the dashboard:

```text
Type: CNAME
Name: vps1
Target: <target from vercel domains inspect>
Proxy status: DNS only for initial Vercel verification
```

After Vercel verifies the domain, switch the record to proxied if you want Cloudflare Access to protect the app at the edge.

## 3. Protect the Dashboard with Cloudflare Access

1. In Cloudflare Zero Trust, create a Self-hosted application.
2. Set the application domain to `vps1.harshsandhu.com`.
3. Add an Allow policy for your email address.
4. Keep the Cloudflare DNS record proxied so requests pass through Access.

## 4. Install the Metrics Agent on the VPS

Create a service user and install the repo:

```bash
sudo useradd --system --home /opt/vps-dashboard --shell /usr/sbin/nologin vpsdash
sudo mkdir -p /opt/vps-dashboard
sudo chown -R vpsdash:vpsdash /opt/vps-dashboard
```

Copy this repo to `/opt/vps-dashboard`, then create `/etc/vps-dashboard-agent.env`:

```bash
METRICS_API_TOKEN=replace-with-a-long-random-token
AGENT_HOST=127.0.0.1
AGENT_PORT=4317
AGENT_DISK_MOUNT=/
AGENT_SAMPLE_INTERVAL_MS=5000
AGENT_MAX_HISTORY=180
```

Install and start the service:

```bash
sudo cp /opt/vps-dashboard/agent/vps-agent.service /etc/systemd/system/vps-agent.service
sudo systemctl daemon-reload
sudo systemctl enable --now vps-agent
sudo systemctl status vps-agent
```

Verify locally on the VPS:

```bash
curl -H "Authorization: Bearer replace-with-a-long-random-token" \
  http://127.0.0.1:4317/metrics
```

## 5. Expose Metrics Through Cloudflare Tunnel

Create a tunnel for the private metrics endpoint:

```bash
cloudflared tunnel create vps1-metrics
```

Use `agent/cloudflared-tunnel.yml.example` as `/etc/cloudflared/config.yml`, then route DNS:

```bash
cloudflared tunnel route dns vps1-metrics vps1-metrics.harshsandhu.com
sudo systemctl enable --now cloudflared
```

In Cloudflare Access, create a Self-hosted application for `vps1-metrics.harshsandhu.com` and protect it with a Service Auth policy. Put the generated service token values in Vercel as `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET`.

## 6. Final Checks

- `https://vps1.harshsandhu.com` requires Cloudflare Access login.
- Vercel shows `vps1.harshsandhu.com` as verified.
- Vercel server logs show successful metrics fetches.
- Browser DevTools do not expose `METRICS_API_TOKEN` or Cloudflare service token values.
- Charts render real VPS data after the first agent samples are collected.
