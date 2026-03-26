import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, headers } from './config.js';

export const options = {
  vus: 50,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  let projectId;

  group('Create Project', () => {
    const payload = JSON.stringify({
      name: `Load Test Project ${__VU}-${__ITER}`,
      description: 'Created during k6 load testing',
    });
    const res = http.post(`${BASE_URL}/api/v1/projects`, payload, { headers });
    check(res, {
      'create status 201': (r) => r.status === 201,
      'create has id': (r) => {
        const body = r.json();
        projectId = body.id || body.data?.id;
        return !!projectId;
      },
    });
    sleep(0.5);
  });

  group('List Projects', () => {
    const res = http.get(`${BASE_URL}/api/v1/projects`, { headers });
    check(res, {
      'list status 200': (r) => r.status === 200,
      'list returns array': (r) => {
        const body = r.json();
        return Array.isArray(body) || Array.isArray(body.data);
      },
    });
    sleep(0.3);
  });

  group('Get Project', () => {
    if (!projectId) return;
    const res = http.get(`${BASE_URL}/api/v1/projects/${projectId}`, { headers });
    check(res, {
      'get status 200': (r) => r.status === 200,
    });
    sleep(0.3);
  });

  group('Update Project', () => {
    if (!projectId) return;
    const payload = JSON.stringify({
      name: `Updated Project ${__VU}-${__ITER}`,
    });
    const res = http.put(`${BASE_URL}/api/v1/projects/${projectId}`, payload, { headers });
    check(res, {
      'update status 200': (r) => r.status === 200,
    });
    sleep(0.3);
  });

  group('Delete Project', () => {
    if (!projectId) return;
    const res = http.del(`${BASE_URL}/api/v1/projects/${projectId}`, null, { headers });
    check(res, {
      'delete status 200 or 204': (r) => r.status === 200 || r.status === 204,
    });
    sleep(0.3);
  });
}
