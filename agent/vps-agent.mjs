#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { hostname, loadavg, platform } from "node:os";
import { readFileSync } from "node:fs";

const host = process.env.AGENT_HOST ?? "127.0.0.1";
const port = Number(process.env.AGENT_PORT ?? 4317);
const token = process.env.METRICS_API_TOKEN;
const mount = process.env.AGENT_DISK_MOUNT ?? "/";
const sampleIntervalMs = Number(process.env.AGENT_SAMPLE_INTERVAL_MS ?? 5000);
const maxHistory = Number(process.env.AGENT_MAX_HISTORY ?? 180);

if (!token) {
  console.error("METRICS_API_TOKEN is required");
  process.exit(1);
}

let previousCpu = readCpuSnapshot();
let previousNetwork = readNetworkTotals();
let previousNetworkAt = Date.now();
const history = [];
let latest = collectSample();

const sampler = setInterval(() => {
  latest = collectSample();
}, sampleIntervalMs);

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

  if (url.pathname === "/healthz") {
    writeJson(response, 200, { ok: true });
    return;
  }

  if (url.pathname !== "/metrics") {
    writeJson(response, 404, { error: "not found" });
    return;
  }

  if (request.headers.authorization !== `Bearer ${token}`) {
    writeJson(response, 401, { error: "unauthorized" });
    return;
  }

  writeJson(response, 200, {
    host: {
      hostname: hostname(),
      platform: platform(),
      uptimeSeconds: readUptimeSeconds(),
    },
    current: latest,
    history,
  });
});

server.listen(port, host, () => {
  console.log(`vps metrics agent listening on http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    clearInterval(sampler);
    server.close(() => process.exit(0));
  });
}

function collectSample() {
  const timestamp = new Date().toISOString();
  const cpu = readCpuUsage();
  const memory = readMemory();
  const disk = readDisk();
  const network = readNetworkRate();
  const loads = loadavg();

  const sample = {
    timestamp,
    cpu: {
      usagePercent: cpu,
      cores: readCpuCores(),
      load1: round(loads[0]),
      load5: round(loads[1]),
      load15: round(loads[2]),
    },
    memory,
    disk,
    network,
  };

  history.push({
    timestamp,
    cpuPercent: sample.cpu.usagePercent,
    memoryPercent: memory.usedPercent,
    diskPercent: disk.usedPercent,
    load1: sample.cpu.load1,
    rxBytesPerSec: network.rxBytesPerSec,
    txBytesPerSec: network.txBytesPerSec,
  });

  if (history.length > maxHistory) {
    history.shift();
  }

  return sample;
}

function readCpuUsage() {
  const current = readCpuSnapshot();
  const idleDelta = current.idle - previousCpu.idle;
  const totalDelta = current.total - previousCpu.total;
  previousCpu = current;

  if (totalDelta <= 0) {
    return 0;
  }

  return round(((totalDelta - idleDelta) / totalDelta) * 100);
}

function readCpuSnapshot() {
  const [line] = readFileSync("/proc/stat", "utf8").split("\n");
  const values = line.trim().split(/\s+/).slice(1).map(Number);
  const idle = values[3] + (values[4] ?? 0);
  const total = values.reduce((sum, value) => sum + value, 0);

  return { idle, total };
}

function readCpuCores() {
  return readFileSync("/proc/cpuinfo", "utf8")
    .split("\n")
    .filter((line) => line.startsWith("processor")).length;
}

function readMemory() {
  const meminfo = Object.fromEntries(
    readFileSync("/proc/meminfo", "utf8")
      .trim()
      .split("\n")
      .map((line) => {
        const [key, value] = line.split(":");
        return [key, Number(value.trim().split(/\s+/)[0]) * 1024];
      }),
  );
  const totalBytes = meminfo.MemTotal;
  const availableBytes = meminfo.MemAvailable;
  const usedBytes = totalBytes - availableBytes;

  return {
    usedBytes,
    totalBytes,
    usedPercent: round((usedBytes / totalBytes) * 100),
  };
}

function readDisk() {
  const output = execFileSync("df", ["-B1", "-P", mount], {
    encoding: "utf8",
  });
  const [, line] = output.trim().split("\n");
  const [, total, used] = line.trim().split(/\s+/);
  const totalBytes = Number(total);
  const usedBytes = Number(used);

  return {
    mount,
    usedBytes,
    totalBytes,
    usedPercent: round((usedBytes / totalBytes) * 100),
  };
}

function readNetworkRate() {
  const now = Date.now();
  const current = readNetworkTotals();
  const seconds = Math.max((now - previousNetworkAt) / 1000, 1);
  const rxBytesPerSec = Math.max(
    0,
    (current.rxTotalBytes - previousNetwork.rxTotalBytes) / seconds,
  );
  const txBytesPerSec = Math.max(
    0,
    (current.txTotalBytes - previousNetwork.txTotalBytes) / seconds,
  );

  previousNetwork = current;
  previousNetworkAt = now;

  return {
    rxBytesPerSec: Math.round(rxBytesPerSec),
    txBytesPerSec: Math.round(txBytesPerSec),
    rxTotalBytes: current.rxTotalBytes,
    txTotalBytes: current.txTotalBytes,
  };
}

function readNetworkTotals() {
  const allowedInterfaces = process.env.AGENT_NETWORK_INTERFACES?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  let rxTotalBytes = 0;
  let txTotalBytes = 0;

  for (const line of readFileSync("/proc/net/dev", "utf8")
    .split("\n")
    .slice(2)) {
    const [namePart, dataPart] = line.split(":");
    if (!dataPart) {
      continue;
    }

    const name = namePart.trim();
    if (name === "lo") {
      continue;
    }

    if (allowedInterfaces && !allowedInterfaces.includes(name)) {
      continue;
    }

    const values = dataPart.trim().split(/\s+/).map(Number);
    rxTotalBytes += values[0];
    txTotalBytes += values[8];
  }

  return { rxTotalBytes, txTotalBytes };
}

function readUptimeSeconds() {
  return Math.floor(Number(readFileSync("/proc/uptime", "utf8").split(" ")[0]));
}

function writeJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function round(value) {
  return Math.round(value * 100) / 100;
}
