import pg from 'pg';
import { writeFileSync, mkdirSync } from 'node:fs';
process.loadEnvFile('.env');
const label = process.argv[2] || 'baseline';
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Invalid label.');
mkdirSync('performance-results', { recursive: true });
const db = new pg.Client({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||5432),user:process.env.DB_USERNAME||'postgres',password:process.env.DB_PASSWORD,database:'ecommerce_performance'});
await db.connect();
try {
  const query=`SELECT o.*, i.* FROM orders o LEFT JOIN order_items i ON i.order_id=o.id WHERE o.user_id=1001 ORDER BY o.created_at DESC`;
  const plans=[];
  for(let attempt=0;attempt<3;attempt++) plans.push((await db.query(`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ${query}`)).rows[0]['QUERY PLAN'][0]);
  const base='http://127.0.0.1:3001/api/v1';
  async function get(path,options={}) {const r=await fetch(base+path,options);if(!r.ok)throw new Error(`${path}: HTTP ${r.status}`);return {data:await r.json(),headers:Object.fromEntries(r.headers)};}
  const login=await get('/auth/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@example.com',password:process.env.SEED_ADMIN_PASSWORD})});
  const token=login.data.data.access_token;
  const stats=async()=> (await db.query(`SELECT coalesce(sum(calls),0)::int calls,coalesce(sum(total_exec_time),0)::float8 execution_ms FROM pg_stat_statements WHERE dbid=(SELECT oid FROM pg_database WHERE datname=current_database()) AND query NOT ILIKE '%pg_stat_statements%'`)).rows[0];
  let before=await stats();
  await get('/admin/inventory',{headers:{Authorization:`Bearer ${token}`}});
  let after=await stats();
  const inventory={queries:after.calls-before.calls,execution_ms:after.execution_ms-before.execution_ms};
  await get('/products');
  before=await stats();
  const catalog=await get('/products');
  after=await stats();
  const result={label,createdAt:new Date().toISOString(),query,plans,inventory,hotCatalog:{queries:after.calls-before.calls,execution_ms:after.execution_ms-before.execution_ms,headers:catalog.headers},indexes:(await db.query("SELECT indexname,indexdef FROM pg_indexes WHERE tablename IN ('orders','order_items') ORDER BY indexname")).rows};
  writeFileSync(`performance-results/${label}-evidence.json`,JSON.stringify(result,null,2));
  console.log(JSON.stringify({label,explain_ms:plans.map(plan=>plan['Execution Time']),inventory,hotCatalog:result.hotCatalog},null,2));
} finally {await db.end();}
