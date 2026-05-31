import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Cpu,
  HardDrive,
  MemoryStick,
  Server,
} from "lucide-react";

import { LocalTime } from "@/components/dashboard/local-time";
import { MetricChart } from "@/components/dashboard/metric-chart";
import { RefreshButton } from "@/components/dashboard/refresh-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  formatBytes,
  formatPercent,
  formatRate,
  formatTimestamp,
  formatUptime,
} from "@/lib/format";
import { getMetrics } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export default async function Home() {
  const result = await getMetrics();

  if (!result.ok) {
    return (
      <DashboardShell>
        <UnavailableState error={result.error} status={result.status} />
      </DashboardShell>
    );
  }

  const { data } = result;
  const latest = data.current;
  const history = data.history;

  return (
    <DashboardShell>
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Badge variant={result.source === "agent" ? "default" : "outline"}>
            {result.source === "agent" ? "Live" : "Demo"}
          </Badge>
          <div>
            <p className="font-pixel text-xs uppercase tracking-[0.22em] text-muted-foreground">
              vps1
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Server vitals
            </h1>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            {result.notice ??
              `Monitoring ${data.host.hostname} with server-rendered metrics from the private agent.`}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="text-right font-mono text-xs text-muted-foreground">
            <div>Updated</div>
            <div className="text-foreground">
              <LocalTime
                fallback={formatTimestamp(latest.timestamp)}
                value={latest.timestamp}
              />
            </div>
          </div>
          <RefreshButton />
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          description={`${latest.cpu.cores} cores, load ${latest.cpu.load1.toFixed(2)}`}
          icon={<Cpu className="size-4" />}
          label="CPU"
          progress={latest.cpu.usagePercent}
          value={formatPercent(latest.cpu.usagePercent)}
        />
        <MetricCard
          description={`${formatBytes(latest.memory.usedBytes)} of ${formatBytes(
            latest.memory.totalBytes,
          )}`}
          icon={<MemoryStick className="size-4" />}
          label="Memory"
          progress={latest.memory.usedPercent}
          value={formatPercent(latest.memory.usedPercent)}
        />
        <MetricCard
          description={`${formatBytes(latest.disk.usedBytes)} of ${formatBytes(
            latest.disk.totalBytes,
          )} on ${latest.disk.mount}`}
          icon={<HardDrive className="size-4" />}
          label="Disk"
          progress={latest.disk.usedPercent}
          value={formatPercent(latest.disk.usedPercent)}
        />
        <MetricCard
          description={`${data.host.platform}, uptime ${formatUptime(data.host.uptimeSeconds)}`}
          icon={<Server className="size-4" />}
          label={data.host.hostname}
          value={latest.cpu.load1.toFixed(2)}
          valueLabel="load"
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <ChartCard description="CPU and memory utilization" title="Compute">
          <MetricChart
            data={history}
            kind="percent"
            series={[
              {
                key: "cpuPercent",
                label: "CPU",
                color: "var(--color-chart-1)",
              },
              {
                key: "memoryPercent",
                label: "Memory",
                color: "var(--color-chart-2)",
              },
            ]}
          />
        </ChartCard>
        <ChartCard description="Root volume utilization" title="Storage">
          <MetricChart
            data={history}
            kind="percent"
            series={[
              {
                key: "diskPercent",
                label: "Disk",
                color: "var(--color-chart-1)",
              },
            ]}
          />
        </ChartCard>
      </section>

      <section className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Network</CardTitle>
            <CardDescription>Current throughput</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NetworkStat
                icon={<ArrowDown className="size-4" />}
                label="Inbound"
                value={formatRate(latest.network.rxBytesPerSec)}
              />
              <NetworkStat
                icon={<ArrowUp className="size-4" />}
                label="Outbound"
                value={formatRate(latest.network.txBytesPerSec)}
              />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3 font-mono text-xs text-muted-foreground">
              <div>
                <div>Total in</div>
                <div className="mt-1 text-foreground">
                  {formatBytes(latest.network.rxTotalBytes)}
                </div>
              </div>
              <div>
                <div>Total out</div>
                <div className="mt-1 text-foreground">
                  {formatBytes(latest.network.txTotalBytes)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <ChartCard
          description="Inbound and outbound traffic rate"
          title="Traffic"
        >
          <MetricChart
            data={history}
            kind="rate"
            series={[
              {
                key: "rxBytesPerSec",
                label: "Inbound",
                color: "var(--color-chart-1)",
              },
              {
                key: "txBytesPerSec",
                label: "Outbound",
                color: "var(--color-chart-2)",
              },
            ]}
          />
        </ChartCard>
      </section>
    </DashboardShell>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        {children}
      </div>
    </main>
  );
}

function MetricCard({
  description,
  icon,
  label,
  progress,
  value,
  valueLabel,
}: {
  description: string;
  icon: React.ReactNode;
  label: string;
  progress?: number;
  value: string;
  valueLabel?: string;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{icon}</span>
          {label}
        </CardTitle>
        <CardAction className="font-mono text-2xl font-semibold">
          {value}
        </CardAction>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {typeof progress === "number" ? (
        <CardContent>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </div>
        </CardContent>
      ) : (
        <CardContent className="font-mono text-xs text-muted-foreground">
          {valueLabel}
        </CardContent>
      )}
    </Card>
  );
}

function ChartCard({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function NetworkStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-3 font-mono text-lg font-semibold">{value}</div>
    </div>
  );
}

function UnavailableState({
  error,
  status,
}: {
  error: string;
  status?: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-destructive" />
          Metrics unavailable
        </CardTitle>
        <CardDescription>
          The dashboard is reachable, but the private metrics agent did not
          respond.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-3 font-mono text-xs">
          {status ? `HTTP ${status}: ` : ""}
          {error}
        </div>
        <RefreshButton />
      </CardContent>
    </Card>
  );
}
