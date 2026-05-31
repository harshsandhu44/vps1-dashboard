export type MetricPoint = {
  timestamp: string;
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  load1: number;
  rxBytesPerSec: number;
  txBytesPerSec: number;
};

export type VpsMetrics = {
  host: {
    hostname: string;
    platform: string;
    uptimeSeconds: number;
  };
  current: {
    timestamp: string;
    cpu: {
      usagePercent: number;
      cores: number;
      load1: number;
      load5: number;
      load15: number;
    };
    memory: {
      usedBytes: number;
      totalBytes: number;
      usedPercent: number;
    };
    disk: {
      mount: string;
      usedBytes: number;
      totalBytes: number;
      usedPercent: number;
    };
    network: {
      rxBytesPerSec: number;
      txBytesPerSec: number;
      rxTotalBytes: number;
      txTotalBytes: number;
    };
  };
  history: MetricPoint[];
};

export type MetricsResult =
  | {
      ok: true;
      data: VpsMetrics;
      source: "agent" | "demo";
      notice?: string;
    }
  | {
      ok: false;
      error: string;
      status?: number;
    };

const sampleWindow = 24;

export async function getMetrics(): Promise<MetricsResult> {
  const metricsUrl = process.env.METRICS_API_URL;
  const metricsToken = process.env.METRICS_API_TOKEN;

  if (!metricsUrl || !metricsToken) {
    return {
      ok: true,
      data: createDemoMetrics(),
      source: "demo",
      notice:
        "Demo data shown. Set METRICS_API_URL and METRICS_API_TOKEN to read vps1.",
    };
  }

  try {
    const response = await fetch(metricsUrl, {
      cache: "no-store",
      headers: buildMetricHeaders(metricsToken),
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `Metrics agent returned ${response.status}`,
      };
    }

    const data = (await response.json()) as VpsMetrics;
    return { ok: true, data, source: "agent" };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to reach the metrics agent",
    };
  }
}

function buildMetricHeaders(metricsToken: string): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${metricsToken}`,
    Accept: "application/json",
  };

  if (process.env.CF_ACCESS_CLIENT_ID) {
    headers["CF-Access-Client-Id"] = process.env.CF_ACCESS_CLIENT_ID;
  }

  if (process.env.CF_ACCESS_CLIENT_SECRET) {
    headers["CF-Access-Client-Secret"] = process.env.CF_ACCESS_CLIENT_SECRET;
  }

  return headers;
}

function createDemoMetrics(): VpsMetrics {
  const now = Date.now();
  const history = Array.from({ length: sampleWindow }, (_, index) => {
    const phase = index / 3;
    return {
      timestamp: new Date(
        now - (sampleWindow - index - 1) * 30_000,
      ).toISOString(),
      cpuPercent: Math.round(18 + Math.sin(phase) * 8 + index * 0.25),
      memoryPercent: Math.round(54 + Math.cos(phase / 2) * 4),
      diskPercent: 68,
      load1: Number((0.42 + Math.sin(phase) * 0.12).toFixed(2)),
      rxBytesPerSec: Math.round(48_000 + Math.sin(phase) * 18_000),
      txBytesPerSec: Math.round(22_000 + Math.cos(phase) * 9_000),
    };
  });
  const latest = history[history.length - 1];

  return {
    host: {
      hostname: "vps1",
      platform: "linux",
      uptimeSeconds: 1_482_240,
    },
    current: {
      timestamp: latest.timestamp,
      cpu: {
        usagePercent: latest.cpuPercent,
        cores: 2,
        load1: latest.load1,
        load5: 0.39,
        load15: 0.34,
      },
      memory: {
        usedBytes: 1_220_218_368,
        totalBytes: 2_147_483_648,
        usedPercent: latest.memoryPercent,
      },
      disk: {
        mount: "/",
        usedBytes: 17_179_869_184,
        totalBytes: 25_769_803_776,
        usedPercent: latest.diskPercent,
      },
      network: {
        rxBytesPerSec: latest.rxBytesPerSec,
        txBytesPerSec: latest.txBytesPerSec,
        rxTotalBytes: 391_204_441_088,
        txTotalBytes: 52_881_218_560,
      },
    },
    history,
  };
}
