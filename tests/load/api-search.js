import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, headers } from './config.js';

export const options = {
  vus: 40,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.05'],
  },
};

const searchTerms = [
  'cinematic sunset',
  'character animation',
  'explosion effect',
  'water simulation',
  'particle system',
  'camera tracking',
  'motion blur',
  'depth of field',
  'color grading',
  'volumetric lighting',
];

export default function () {
  group('Index Document', () => {
    const payload = JSON.stringify({
      title: `Test Document ${__VU}-${__ITER}`,
      content: `Load test content with keywords: ${searchTerms[__VU % searchTerms.length]}`,
      tags: ['load-test', 'k6'],
      type: 'project',
    });
    const res = http.post(`${BASE_URL}/api/v1/search/index`, payload, { headers });
    check(res, {
      'index status 200 or 201': (r) => r.status === 200 || r.status === 201,
    });
    sleep(0.3);
  });

  group('Search Query', () => {
    const query = searchTerms[(__VU + __ITER) % searchTerms.length];
    const res = http.get(`${BASE_URL}/api/v1/search?q=${encodeURIComponent(query)}&limit=20`, { headers });
    check(res, {
      'search status 200': (r) => r.status === 200,
      'search has results': (r) => {
        const body = r.json();
        return body.results !== undefined || body.data !== undefined;
      },
    });
    sleep(0.3);
  });

  group('Search With Filters', () => {
    const query = searchTerms[(__VU + __ITER + 1) % searchTerms.length];
    const res = http.get(
      `${BASE_URL}/api/v1/search?q=${encodeURIComponent(query)}&type=project&limit=10&sort=relevance`,
      { headers }
    );
    check(res, {
      'filtered search status 200': (r) => r.status === 200,
    });
    sleep(0.3);
  });
}
