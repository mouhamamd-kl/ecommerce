import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

// The setup commit predates requirement three. No checkout or working-tree edit is needed.
const revision = process.argv[2] || 'e485cf10a72f6991c1f68ea57c5bec11dfcc51d0';
const root = resolve('.');
mkdirSync('.temp', { recursive: true });
const target = mkdtempSync(join(root, '.temp', 'performance-baseline-'));
const archive = execFileSync('git', ['-c', `safe.directory=${root.replaceAll('\\','/')}`, 'archive', '--format=tar', revision], { maxBuffer: 20 * 1024 * 1024 });
writeFileSync(join(target, 'source.tar'), archive);
execFileSync('tar', ['-xf', join(target, 'source.tar'), '-C', target]);
const appFile = join(target, 'src', 'app.module.ts');
const original = readFileSync(appFile, 'utf8');
if (!original.includes('limit: 100,')) throw new Error('Baseline rate-limit location changed; review the selected Git revision.');
writeFileSync(appFile, original.replace('limit: 100,', "limit: Number(process.env.HTTP_RATE_LIMIT || 100),"));
execFileSync('docker', ['build', '-t', 'ecommerce-performance:baseline', target], { stdio: 'inherit' });
console.log(`Baseline built from ${revision}; only the benchmark rate-limit setting was parameterized.`);
