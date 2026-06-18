#!/usr/bin/env node
// Integration sanity check for Phase A.6. Not a real test suite — Phase B covers that.

const BASE = process.env.API_BASE ?? 'http://localhost:3000';

async function request(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const ct = res.headers.get('content-type') ?? '';
  const payload = ct.includes('application/json') ? await res.json() : await res.text();
  return { status: res.status, payload };
}

const failures = [];
function assert(cond, msg) {
  if (cond) {
    console.log(`  ✓ ${msg}`);
  } else {
    failures.push(msg);
    console.log(`  ✗ ${msg}`);
  }
}

async function section(name, fn) {
  console.log(`\n[${name}]`);
  await fn();
}

(async () => {
  let adminToken, aliceToken, adminUser, aliceUser;

  await section('auth: login', async () => {
    const { status, payload } = await request('POST', '/auth/login', {
      body: { email: 'admin@example.com', password: 'Admin123!' },
    });
    assert(status === 201, `POST /auth/login admin returns 201 (got ${status})`);
    assert(typeof payload.token === 'string', 'response has token');
    assert(payload.user?.email === 'admin@example.com', 'response user.email matches');
    assert(payload.user?.passwordHash === undefined, 'response user has no passwordHash');
    adminToken = payload.token;
    adminUser = payload.user;

    const bad = await request('POST', '/auth/login', {
      body: { email: 'admin@example.com', password: 'wrong' },
    });
    assert(bad.status === 401, `POST /auth/login wrong pw returns 401 (got ${bad.status})`);

    const alice = await request('POST', '/auth/login', {
      body: { email: 'alice@example.com', password: 'Password1!' },
    });
    assert(alice.status === 201, 'alice can log in');
    aliceToken = alice.payload.token;
    aliceUser = alice.payload.user;
  });

  await section('auth: me', async () => {
    const me = await request('GET', '/auth/me', { token: adminToken });
    assert(me.status === 200, `GET /auth/me returns 200 (got ${me.status})`);
    assert(me.payload?.email === 'admin@example.com', 'me returns admin');
    const anon = await request('GET', '/auth/me');
    assert(anon.status === 401, 'GET /auth/me without token → 401');
  });

  await section('users', async () => {
    const list = await request('GET', '/users', { token: adminToken });
    assert(list.status === 200, `GET /users (auth) → 200 (got ${list.status})`);
    assert(Array.isArray(list.payload) && list.payload.length >= 3, 'users list ≥ 3');
    const alice = await request('GET', `/users/${aliceUser.id}`, { token: adminToken });
    assert(alice.status === 200, 'GET /users/:id → 200');
    assert(Array.isArray(alice.payload?.assignedTasks), 'user includes assignedTasks[]');
  });

  let adminProject, aliceProject;

  await section('projects: list + ownership', async () => {
    const list = await request('GET', '/projects', { token: adminToken });
    assert(list.status === 200, 'GET /projects → 200');
    assert(Array.isArray(list.payload) && list.payload.length >= 4, 'projects list ≥ 4');
    adminProject = list.payload.find((p) => p.ownerId === adminUser.id);
    aliceProject = list.payload.find((p) => p.ownerId === aliceUser.id);
    assert(!!adminProject, 'admin-owned project exists');
    assert(!!aliceProject, 'alice-owned project exists');

    const search = await request('GET', '/projects?search=apollo', { token: adminToken });
    assert(search.status === 200, 'GET /projects?search=apollo → 200');
    assert(
      search.payload.every((p) => p.name.toLowerCase().includes('apollo')),
      'search filter matches case-insensitively',
    );
  });

  await section('projects: create + ownership check', async () => {
    const created = await request('POST', '/projects', {
      token: adminToken,
      body: { name: 'ADMIN_Smoke_Project', description: 'from verify' },
    });
    assert(created.status === 201, `POST /projects → 201 (got ${created.status})`);
    assert(created.payload.ownerId === adminUser.id, 'new project owned by admin');

    const aliceTriesDelete = await request('DELETE', `/projects/${adminProject.id}`, {
      token: aliceToken,
    });
    assert(
      aliceTriesDelete.status === 403,
      `alice deleting admin project → 403 (got ${aliceTriesDelete.status})`,
    );

    const own = await request('DELETE', `/projects/${created.payload.id}`, { token: adminToken });
    assert(own.status === 200 || own.status === 204, 'admin deletes own project → 2xx');
  });

  await section('tasks', async () => {
    const tasks = await request('GET', `/projects/${adminProject.id}/tasks`, {
      token: adminToken,
    });
    assert(tasks.status === 200, 'GET /projects/:id/tasks → 200');
    assert(Array.isArray(tasks.payload), 'tasks list is array');

    const filtered = await request(
      'GET',
      `/projects/${adminProject.id}/tasks?status=done`,
      { token: adminToken },
    );
    assert(filtered.status === 200, 'status filter → 200');
    assert(
      filtered.payload.every((t) => t.status === 'done'),
      'status filter returns only done tasks',
    );

    const created = await request('POST', `/projects/${adminProject.id}/tasks`, {
      token: adminToken,
      body: { title: 'Smoke Task', priority: 'high' },
    });
    assert(created.status === 201, `POST /projects/:id/tasks → 201 (got ${created.status})`);
    const updated = await request('PATCH', `/tasks/${created.payload.id}`, {
      token: adminToken,
      body: { status: 'doing' },
    });
    assert(updated.status === 200, 'PATCH /tasks/:id → 200');
    assert(updated.payload.status === 'doing', 'status persisted');
    const deleted = await request('DELETE', `/tasks/${created.payload.id}`, {
      token: adminToken,
    });
    assert(deleted.status === 200 || deleted.status === 204, 'DELETE /tasks/:id → 2xx');
  });

  await section('test seam: /test/seed/* + /test/reset', async () => {
    const userRes = await request('POST', '/test/seed/user', {
      body: { role: 'admin', emailPrefix: 'verify_admin' },
    });
    assert(userRes.status === 201, `POST /test/seed/user → 201 (got ${userRes.status})`);
    assert(userRes.payload.email.startsWith('E2E_'), 'seeded email has E2E_ prefix');
    assert(typeof userRes.payload.token === 'string', 'seed user returns token');
    assert(userRes.payload.password === 'E2EPass1!', 'seed user returns plaintext password');

    const projRes = await request('POST', '/test/seed/project', {
      body: { ownerId: userRes.payload.id, name: 'verify_proj' },
    });
    assert(projRes.status === 201, 'seed/project → 201');
    assert(projRes.payload.name.startsWith('E2E_'), 'project name auto-prefixed E2E_');

    const taskRes = await request('POST', '/test/seed/task', {
      body: { projectId: projRes.payload.id, title: 'verify_task' },
    });
    assert(taskRes.status === 201, 'seed/task → 201');

    const reset = await request('POST', '/test/reset');
    assert(reset.status === 204, `reset → 204 (got ${reset.status})`);

    // Confirm seeded user gone; dev admin still works
    const loginSeed = await request('POST', '/auth/login', {
      body: { email: userRes.payload.email, password: userRes.payload.password },
    });
    assert(loginSeed.status === 401, 'post-reset: seeded E2E user cannot log in (401)');

    const loginAdmin = await request('POST', '/auth/login', {
      body: { email: 'admin@example.com', password: 'Admin123!' },
    });
    assert(loginAdmin.status === 201, 'post-reset: dev admin login still works');
  });

  console.log('\n' + '─'.repeat(40));
  if (failures.length === 0) {
    console.log('ALL CHECKS PASSED');
    process.exit(0);
  } else {
    console.log(`${failures.length} FAILURES:`);
    failures.forEach((f) => console.log(` - ${f}`));
    process.exit(1);
  }
})().catch((err) => {
  console.error('verify-api crashed:', err);
  process.exit(1);
});
