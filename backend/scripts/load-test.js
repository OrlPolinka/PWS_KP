const { performance } = require('node:perf_hooks');

const baseUrl = process.env.LOAD_TEST_URL || 'http://127.0.0.1:3000/health';
const requestCount = Number(process.env.LOAD_TEST_REQUESTS || 500);
const concurrency = Number(process.env.LOAD_TEST_CONCURRENCY || 25);
const p95LimitMs = Number(process.env.LOAD_TEST_P95_LIMIT_MS || 1000);
const target = new URL(baseUrl);
const allowedHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

if (target.protocol !== 'http:' || !allowedHosts.has(target.hostname)) {
  throw new Error('Load test target must be an HTTP loopback URL (localhost, 127.0.0.1, or ::1).');
}
if (!Number.isInteger(requestCount) || requestCount < 1 || requestCount > 5000) {
  throw new Error('LOAD_TEST_REQUESTS must be an integer between 1 and 5000.');
}
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 100) {
  throw new Error('LOAD_TEST_CONCURRENCY must be an integer between 1 and 100.');
}
if (!Number.isFinite(p95LimitMs) || p95LimitMs <= 0) {
  throw new Error('LOAD_TEST_P95_LIMIT_MS must be a positive number.');
}

async function main() {
  const latencies = [];
  const failures = [];
  let nextRequest = 0;
  const startedAt = performance.now();

  async function worker() {
    while (true) {
      const requestId = nextRequest++;
      if (requestId >= requestCount) return;

      const requestStartedAt = performance.now();
      try {
        const response = await fetch(target, { signal: AbortSignal.timeout(10000) });
        await response.arrayBuffer();
        latencies.push(performance.now() - requestStartedAt);
        if (!response.ok) failures.push(`request ${requestId}: HTTP ${response.status}`);
      } catch (error) {
        failures.push(`request ${requestId}: ${error.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, requestCount) }, worker));
  const durationMs = performance.now() - startedAt;
  latencies.sort((left, right) => left - right);
  const percentile95 = latencies.length
    ? latencies[Math.ceil(latencies.length * 0.95) - 1]
    : Infinity;
  const result = {
    target: target.href,
    requests: requestCount,
    concurrency: Math.min(concurrency, requestCount),
    failures: failures.length,
    durationMs: Math.round(durationMs),
    requestsPerSecond: Number((requestCount / (durationMs / 1000)).toFixed(1)),
    p95LatencyMs: Math.round(percentile95),
    p95LimitMs,
  };

  console.log(JSON.stringify(result, null, 2));
  if (failures.length) console.error(failures.slice(0, 5).join('\n'));
  if (failures.length || percentile95 > p95LimitMs) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
