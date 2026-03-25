import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, headers } from './config.js';

export const options = {
  vus: 20,
  duration: '1m',
  thresholds: {
    'http_req_duration{type:submit}': ['p(95)<1000'],
    'http_req_duration{type:poll}': ['p(99)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  let jobId;

  group('Submit Generation Job', () => {
    const payload = JSON.stringify({
      projectId: `proj-${__VU}`,
      sceneId: `scene-${__VU}-${__ITER}`,
      shotId: `shot-${__VU}-${__ITER}`,
      prompt: 'A cinematic sunrise over mountains with volumetric fog',
      settings: {
        resolution: '1920x1080',
        fps: 24,
        duration: 5,
        style: 'cinematic',
      },
    });
    const res = http.post(`${BASE_URL}/api/v1/generation/submit`, payload, {
      headers,
      tags: { type: 'submit' },
    });
    check(res, {
      'submit status 201 or 202': (r) => r.status === 201 || r.status === 202,
      'submit has jobId': (r) => {
        const body = r.json();
        jobId = body.jobId || body.id || body.data?.jobId || body.data?.id;
        return !!jobId;
      },
    });
    sleep(1);
  });

  group('Poll Job Status', () => {
    if (!jobId) return;
    const maxPolls = 5;
    for (let i = 0; i < maxPolls; i++) {
      const res = http.get(`${BASE_URL}/api/v1/generation/status/${jobId}`, {
        headers,
        tags: { type: 'poll' },
      });
      check(res, {
        'poll status 200': (r) => r.status === 200,
        'poll has status field': (r) => {
          const body = r.json();
          const status = body.status || body.data?.status;
          return !!status;
        },
      });

      const body = res.json();
      const status = body.status || body.data?.status;
      if (status === 'completed' || status === 'failed') break;

      sleep(2);
    }
  });
}
