import http from 'k6/http';
import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const catalog = new Trend('catalog_ms', true);
const conditional = new Trend('conditional_ms', true);
const orders = new Trend('orders_ms', true);
const inventory = new Trend('inventory_ms', true);
const catalogRequests = new Counter('catalog_requests');
const conditionalRequests = new Counter('conditional_requests');
const orderRequests = new Counter('order_requests');
const inventoryRequests = new Counter('inventory_requests');
const base = __ENV.BASE_URL || 'http://localhost:3001/api/v1';
export const options = {
  scenarios: Object.fromEntries(['catalog', 'conditional', 'orders', 'inventory'].map(name => [name, {
    executor: 'constant-vus', vus: 2, duration: __ENV.DURATION || '30s', exec: name, gracefulStop: '10s',
  }])),
  summaryTrendStats: ['avg','min','med','p(50)','p(95)','p(99)','max'],
  thresholds: { checks: ['rate>0.99'], http_req_failed: ['rate<0.01'] },
};
export function setup() {
  const login = (role,email,password) => {
    const response = http.post(`${base}/auth/${role}/login`,JSON.stringify({email,password}),{headers:{'Content-Type':'application/json'}});
    if (response.status !== 200) throw new Error(`Benchmark ${role} login failed: HTTP ${response.status}`);
    return response.json('data.access_token');
  };
  const userToken = login('customer','perf-user-00001@example.test',__ENV.PERF_PASSWORD);
  const adminToken = login('admin','admin@example.com',__ENV.PERF_ADMIN_PASSWORD);
  const first = http.get(`${base}/products`);
  return {userToken,adminToken,etag:first.headers.Etag || first.headers.ETag};
}
function measured(path,trend,counter,params={},expected=200) {
  const response=http.get(`${base}${path}`,{...params,tags:{name:path}});
  trend.add(response.timings.duration); counter.add(1);
  check(response,{[`HTTP ${expected}`]:r=>r.status===expected});
  return response;
}
export function catalogScenario() { measured('/products',catalog,catalogRequests); }
export { catalogScenario as catalog };
export function conditionalScenario(data) { measured('/products',conditional,conditionalRequests,{headers:{'If-None-Match':data.etag}},304); }
export { conditionalScenario as conditional };
export function ordersScenario(data) { measured('/orders',orders,orderRequests,{headers:{Authorization:`Bearer ${data.userToken}`}}); }
export { ordersScenario as orders };
export function inventoryScenario(data) { measured('/admin/inventory',inventory,inventoryRequests,{headers:{Authorization:`Bearer ${data.adminToken}`}}); }
export { inventoryScenario as inventory };
export function handleSummary(data) {
  const result={label:__ENV.LABEL || 'run',generatedAt:new Date().toISOString(),options:options.scenarios,metrics:data.metrics};
  return {[`/results/${result.label}.json`]:JSON.stringify(result,null,2),stdout:JSON.stringify({label:result.label,metrics:Object.fromEntries(['catalog_ms','conditional_ms','orders_ms','inventory_ms','http_reqs','http_req_failed','checks'].map(key=>[key,data.metrics[key]?.values]))},null,2)+'\n'};
}
