import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL } from './config.js';

const jsonHeaders = { 'Content-Type': 'application/json' };

export const options = {
  vus: 30,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const uniqueUser = `loadtest-${__VU}-${__ITER}-${Date.now()}`;
  let accessToken;
  let refreshToken;

  group('Register', () => {
    const payload = JSON.stringify({
      username: uniqueUser,
      email: `${uniqueUser}@loadtest.local`,
      password: 'LoadTest!Pass123',
    });
    const res = http.post(`${BASE_URL}/api/v1/auth/register`, payload, { headers: jsonHeaders });
    check(res, {
      'register status 201': (r) => r.status === 201,
      'register has token': (r) => {
        const body = r.json();
        accessToken = body.token || body.accessToken || body.data?.token || body.data?.accessToken;
        return !!accessToken;
      },
    });
    sleep(0.5);
  });

  group('Login', () => {
    const payload = JSON.stringify({
      email: `${uniqueUser}@loadtest.local`,
      password: 'LoadTest!Pass123',
    });
    const res = http.post(`${BASE_URL}/api/v1/auth/login`, payload, { headers: jsonHeaders });
    check(res, {
      'login status 200': (r) => r.status === 200,
      'login has tokens': (r) => {
        const body = r.json();
        accessToken = body.token || body.accessToken || body.data?.token || body.data?.accessToken;
        refreshToken = body.refreshToken || body.data?.refreshToken;
        return !!accessToken;
      },
    });
    sleep(0.5);
  });

  group('Refresh Token', () => {
    if (!refreshToken && !accessToken) return;
    const payload = JSON.stringify({
      refreshToken: refreshToken || accessToken,
    });
    const res = http.post(`${BASE_URL}/api/v1/auth/refresh`, payload, { headers: jsonHeaders });
    check(res, {
      'refresh status 200': (r) => r.status === 200,
      'refresh has new token': (r) => {
        const body = r.json();
        const newToken = body.token || body.accessToken || body.data?.token || body.data?.accessToken;
        return !!newToken;
      },
    });
    sleep(0.5);
  });
}
