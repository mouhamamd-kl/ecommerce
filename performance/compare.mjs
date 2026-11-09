import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const labels = ['baseline', 'indexes', 'database', 'redis', 'optimized'];
const stages = labels.filter(label => existsSync(`performance-results/${label}.json`)).map(label => {
  const data = JSON.parse(readFileSync(`performance-results/${label}.json`, 'utf8'));
  const metric = name => data.metrics[name]?.values;
  return { label, generatedAt: data.generatedAt, requests: metric('http_reqs').count,
    requestsPerSecond: metric('http_reqs').rate, failureRate: metric('http_req_failed').rate,
    overall: metric('http_req_duration'), catalog: metric('catalog_ms'), conditional: metric('conditional_ms'), orders: metric('orders_ms'), inventory: metric('inventory_ms') };
});
const before = stages.find(stage => stage.label === 'baseline');
const after = stages.find(stage => stage.label === 'optimized');
const improvement = before && after ? { throughputFactor: after.requestsPerSecond / before.requestsPerSecond,
  orderP95ReductionPercent: 100 * (1 - after.orders['p(95)'] / before.orders['p(95)']),
  inventoryP95ReductionPercent: 100 * (1 - after.inventory['p(95)'] / before.inventory['p(95)']) } : null;
const evidence = Object.fromEntries(['baseline', 'database', 'optimized'].filter(label => existsSync(`performance-results/${label}-evidence.json`)).map(label => [label, JSON.parse(readFileSync(`performance-results/${label}-evidence.json`, 'utf8'))]));
const firstMetadataPath = `performance-results/${stages[0]?.label}-metadata.json`;
const duration = existsSync(firstMetadataPath) ? JSON.parse(readFileSync(firstMetadataPath, 'utf8')).workload.duration : '30s';
const result = { workload: { scenarios: ['catalog','conditional','orders','inventory'], vusPerScenario: 2, duration }, stages, improvement, evidence };
writeFileSync('performance-results/summary.json', JSON.stringify(result, null, 2));
let md = `# Measured performance results\n\nSame k6 workload: four scenarios, two VUs each, ${duration} per stage. Times are milliseconds.\n\n| Stage | Requests/s | Overall p50 | p95 | p99 | Failed requests |\n|---|---:|---:|---:|---:|---:|\n`;
for (const stage of stages) md += `| ${stage.label} | ${stage.requestsPerSecond.toFixed(2)} | ${stage.overall['p(50)'].toFixed(2)} | ${stage.overall['p(95)'].toFixed(2)} | ${stage.overall['p(99)'].toFixed(2)} | ${(stage.failureRate*100).toFixed(2)}% |\n`;
md += '\n| Endpoint | Before p50 | Before p95 | Before p99 | After p50 | After p95 | After p99 |\n|---|---:|---:|---:|---:|---:|---:|\n';
if (before && after) for (const key of ['catalog','conditional','orders','inventory']) md += `| ${key} | ${['p(50)','p(95)','p(99)'].map(p => before[key][p].toFixed(2)).join(' | ')} | ${['p(50)','p(95)','p(99)'].map(p => after[key][p].toFixed(2)).join(' | ')} |\n`;
md += '\nThese are local, short-run measurements on shared Docker Desktop hardware. Compare the direct EXPLAIN plans and query counts as well as the load-test percentiles.\n';
const indexStage = stages.find(stage => stage.label === 'indexes');
if (before && indexStage && indexStage.requestsPerSecond <= before.requestsPerSecond) {
  md += '\nThe index-only mixed-load sample did not improve throughput. It still executed the N+1 queries; round-trip/pool pressure and shared-host variation remain relevant when interpreting the result.\n';
}
writeFileSync('performance-results/summary.md', md);
console.log(md);
