const http = require('http');
const assert = require('assert');

const BASE = process.env.TEST_URL || 'http://localhost:3000';

let passed = 0;
let failed = 0;

async function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const req = http.request(url, { method: options.method || 'GET', headers: options.headers }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body, json: () => JSON.parse(body) }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
  }
}

async function run() {
  console.log('\n  Running tests...\n');

  await test('GET / returns 200 with HTML', async () => {
    const res = await request('/');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('Hello World'));
  });

  await test('GET /api returns 200', async () => {
    const res = await request('/api');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('Fabrikam Bank API'));
  });

  await test('GET /api/accounts/test returns test account', async () => {
    const res = await request('/api/accounts/test');
    assert.strictEqual(res.status, 200);
    const data = res.json();
    assert.strictEqual(data.user, 'test');
    assert.strictEqual(typeof data.balance, 'number');
    assert.ok(Array.isArray(data.transactions));
  });

  await test('GET /api/accounts/nonexistent returns 404', async () => {
    const res = await request('/api/accounts/nonexistent');
    assert.strictEqual(res.status, 404);
  });

  await test('POST /api/accounts creates new account', async () => {
    const res = await request('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'testuser_' + Date.now(), currency: '€', balance: 100 }),
    });
    assert.strictEqual(res.status, 201);
    const data = res.json();
    assert.strictEqual(data.currency, '€');
    assert.strictEqual(data.balance, 100);
  });

  await test('POST /api/accounts without params returns 400', async () => {
    const res = await request('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.strictEqual(res.status, 400);
  });

  console.log(`\n  ${passed} passing, ${failed} failing\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
