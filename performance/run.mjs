import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

process.loadEnvFile('.env');
const label = process.argv[2] || 'baseline';
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Use an alphanumeric benchmark label.');
mkdirSync('performance-results', { recursive: true });
const env = {
  ...process.env,
  PERF_PASSWORD: process.env.SEED_CUSTOMER_PASSWORD,
  PERF_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD,
};
const args = ['compose', '-f', 'docker-compose.performance.yml', 'run', '--rm', '-T',
  '-e', 'PERF_PASSWORD', '-e', 'PERF_ADMIN_PASSWORD', '-e', `LABEL=${label}`, '-e', `DURATION=${process.env.PERF_DURATION || '30s'}`,
  'k6', 'run', '/scripts/load.k6.js'];
execFileSync('docker', args, { env, stdio: 'inherit', timeout: 180000 });
const info = JSON.parse(execFileSync('docker', ['inspect', 'ecommerce-performance-api-1'], { encoding: 'utf8' }))[0];
const allowed = new Set(['DB_DATABASE','HTTP_RATE_LIMIT','CATALOG_CACHE_ENABLED','DB_READ_REPLICA_ENABLED','CATALOG_CACHE_TTL_SECONDS']);
const environment = Object.fromEntries(info.Config.Env.map(item => [item.slice(0,item.indexOf('=')),item.slice(item.indexOf('=')+1)]).filter(([key]) => allowed.has(key)));
writeFileSync(`performance-results/${label}-metadata.json`, JSON.stringify({ imageId: info.Image, scriptSha256: createHash('sha256').update(readFileSync('performance/load.k6.js')).digest('hex'), environment, workload: { vusPerScenario: 2, scenarioCount: 4, duration: process.env.PERF_DURATION || '30s' } }, null, 2));
const image = execFileSync('docker', ['image', 'inspect', 'grafana/k6:latest', '--format', '{{json .RepoDigests}}'], { encoding: 'utf8' }).trim();
writeFileSync('performance-results/k6-image.json', image+'\n');
