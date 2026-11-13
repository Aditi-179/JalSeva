const http = require('http');
const { startServer } = require('../src/app');

function makeRequest(port, options, postData = null) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: '127.0.0.1',
      port: port,
      path: options.path,
      method: options.method,
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      const dataStr = typeof postData === 'object' ? JSON.stringify(postData) : postData;
      req.write(dataStr);
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n========================================');
  console.log(' Starting AquaAlert Automated API Tests ');
  console.log('========================================\n');

  const server = await startServer();
  const address = server.address();
  const PORT = address.port;

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health Check
    const health = await makeRequest(PORT, {
      path: '/api/health',
      method: 'GET'
    });
    assert(health.status === 200 && health.body.status === 'OK', 'GET /api/health returns 200 OK');

    // 2. Incident Creation (POST /api/incidents)
    const newIncidentData = {
      area: 'Testing Valley, Sector 9',
      issue_type: 'No Water Supply',
      severity: 'High',
      description: 'Water disruption reported during automated integration testing suite.'
    };
    const createRes = await makeRequest(PORT, {
      path: '/api/incidents',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, newIncidentData);

    assert(createRes.status === 201 && createRes.body.success === true, 'POST /api/incidents creates incident');
    const createdIncident = createRes.body.incident;
    assert(Boolean(createdIncident.incident_id), `Created incident has unique ID: ${createdIncident.incident_id}`);

    // 3. Incident Listing (GET /api/incidents)
    const listRes = await makeRequest(PORT, {
      path: '/api/incidents',
      method: 'GET'
    });
    assert(listRes.status === 200 && Array.isArray(listRes.body.incidents), 'GET /api/incidents returns array');
    assert(listRes.body.incidents.length > 0, 'Incidents array contains records');

    // 4. Incident Detail (GET /api/incidents/:id)
    const detailRes = await makeRequest(PORT, {
      path: `/api/incidents/${createdIncident.incident_id}`,
      method: 'GET'
    });
    assert(detailRes.status === 200 && detailRes.body.incident.incident_id === createdIncident.incident_id, 'GET /api/incidents/:id retrieves details');

    // 5. Admin Login - Failed attempt
    const badLogin = await makeRequest(PORT, {
      path: '/api/admin/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: 'admin', password: 'WrongPassword!' });
    assert(badLogin.status === 401, 'POST /api/admin/login rejects wrong password with 401');

    // 6. Admin Login - Successful attempt
    const goodLogin = await makeRequest(PORT, {
      path: '/api/admin/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: 'admin', password: 'Admin@123' });
    assert(goodLogin.status === 200 && Boolean(goodLogin.body.token), 'POST /api/admin/login returns JWT token');
    const token = goodLogin.body.token;

    // 7. Admin Dashboard Stats (GET /api/admin/dashboard)
    const dashRes = await makeRequest(PORT, {
      path: '/api/admin/dashboard',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert(dashRes.status === 200 && dashRes.body.stats.total > 0, 'GET /api/admin/dashboard returns stats and metrics');
    assert(Array.isArray(dashRes.body.charts.reportsByCategory), 'Dashboard includes category analytics');

    // 8. Admin Update Incident Status (PATCH /api/admin/incidents/:id)
    const updateRes = await makeRequest(PORT, {
      path: `/api/admin/incidents/${createdIncident.incident_id}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      status: 'In Progress',
      severity: 'Critical',
      resolution_note: 'Maintenance engineer has been deployed to the site.'
    });
    assert(updateRes.status === 200 && updateRes.body.incident.status === 'In Progress', 'PATCH /api/admin/incidents/:id updates status to In Progress');
    assert(updateRes.body.incident.severity === 'Critical', 'PATCH /api/admin/incidents/:id updates severity');

    // 9. Unauthenticated Admin Request Protection
    const unauthorizedRes = await makeRequest(PORT, {
      path: '/api/admin/dashboard',
      method: 'GET'
    });
    assert(unauthorizedRes.status === 401, 'Admin routes protected with 401 when token is missing');

    console.log(`\n========================================`);
    console.log(`Tests Completed: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    server.close();
    process.exit(failed === 0 ? 0 : 1);
  } catch (err) {
    console.error('Test execution error:', err);
    server.close();
    process.exit(1);
  }
}

runTests();
