import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
process.loadEnvFile('.env');
mkdirSync('performance-results', { recursive: true });
const run = (command, args, env = process.env) => execFileSync(command, args, { env, stdio: 'inherit' });
const node = (script, ...args) => run(process.execPath, [`performance/${script}.mjs`, ...args]);

// Start the ordinary stack first; it supplies the primary, replica, and Redis.
run('docker', ['compose', 'up', '-d', '--build', '--wait', '--wait-timeout', '180']);
run('docker', ['image', 'tag', 'ecommerce-app:latest', 'ecommerce-performance:optimized']);
if (!process.argv.includes('--skip-baseline-build')) node('build-baseline');
node('prepare', '--baseline');
for (const stage of [
  { label: 'baseline', image: 'baseline', cache: 'false', replica: 'false' },
  { label: 'indexes', image: 'baseline', cache: 'false', replica: 'false' },
  { label: 'database', image: 'optimized', cache: 'false', replica: 'false' },
  { label: 'redis', image: 'optimized', cache: 'true', replica: 'false' },
  { label: 'optimized', image: 'optimized', cache: 'true', replica: 'true' },
]) {
  if (stage.label === 'indexes') node('apply-indexes');
  const env = { ...process.env, PERFORMANCE_IMAGE_TAG: stage.image, CATALOG_CACHE_ENABLED: stage.cache, DB_READ_REPLICA_ENABLED: stage.replica };
  run('docker', ['compose', '-f', 'docker-compose.performance.yml', 'up', '-d', '--wait', '--wait-timeout', '120'], env);
  run(process.execPath, ['performance/capture.mjs', stage.label], env);
  run(process.execPath, ['performance/run.mjs', stage.label], env);
}
node('verify');
node('compare');
