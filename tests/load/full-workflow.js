import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL } from './config.js';

const jsonHeaders = { 'Content-Type': 'application/json' };

export const options = {
  vus: 10,
  duration: '3m',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  let accessToken;
  let authHeaders;
  let projectId;
  let sceneId;
  let shotId;
  let jobId;

  // Step 1: Login
  group('Login', () => {
    const payload = JSON.stringify({
      email: `workflow-user-${__VU}@loadtest.local`,
      password: 'WorkflowTest!123',
    });
    const res = http.post(`${BASE_URL}/api/v1/auth/login`, payload, { headers: jsonHeaders });
    check(res, { 'login ok': (r) => r.status === 200 });
    const body = res.json();
    accessToken = body.token || body.accessToken || body.data?.token || body.data?.accessToken || 'test-token';
    authHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
    sleep(1);
  });

  if (!authHeaders) {
    authHeaders = { ...jsonHeaders, 'Authorization': 'Bearer test-token' };
  }

  // Step 2: Create Project
  group('Create Project', () => {
    const payload = JSON.stringify({
      name: `Workflow Project ${__VU}-${__ITER}`,
      description: 'End-to-end workflow load test project',
    });
    const res = http.post(`${BASE_URL}/api/v1/projects`, payload, { headers: authHeaders });
    check(res, {
      'project created': (r) => r.status === 201 || r.status === 200,
    });
    const body = res.json();
    projectId = body.id || body.data?.id;
    sleep(1);
  });

  // Step 3: Create Scene
  group('Create Scene', () => {
    if (!projectId) return;
    const payload = JSON.stringify({
      projectId,
      name: `Scene ${__ITER}`,
      description: 'Opening scene for workflow test',
      order: 1,
    });
    const res = http.post(`${BASE_URL}/api/v1/projects/${projectId}/scenes`, payload, { headers: authHeaders });
    check(res, {
      'scene created': (r) => r.status === 201 || r.status === 200,
    });
    const body = res.json();
    sceneId = body.id || body.data?.id;
    sleep(1);
  });

  // Step 4: Create Shot
  group('Create Shot', () => {
    if (!projectId || !sceneId) return;
    const payload = JSON.stringify({
      sceneId,
      name: `Shot ${__ITER}`,
      prompt: 'Wide angle establishing shot of a futuristic city at dawn',
      duration: 5,
      order: 1,
    });
    const res = http.post(
      `${BASE_URL}/api/v1/projects/${projectId}/scenes/${sceneId}/shots`,
      payload,
      { headers: authHeaders }
    );
    check(res, {
      'shot created': (r) => r.status === 201 || r.status === 200,
    });
    const body = res.json();
    shotId = body.id || body.data?.id;
    sleep(1);
  });

  // Step 5: Generate Video
  group('Generate Video', () => {
    if (!projectId || !sceneId || !shotId) return;
    const payload = JSON.stringify({
      projectId,
      sceneId,
      shotId,
      prompt: 'Wide angle establishing shot of a futuristic city at dawn',
      settings: {
        resolution: '1920x1080',
        fps: 24,
        duration: 5,
        style: 'cinematic',
      },
    });
    const res = http.post(`${BASE_URL}/api/v1/generation/submit`, payload, { headers: authHeaders });
    check(res, {
      'generation submitted': (r) => r.status === 201 || r.status === 202,
    });
    const body = res.json();
    jobId = body.jobId || body.id || body.data?.jobId || body.data?.id;
    sleep(2);
  });

  // Step 6: Poll Status
  group('Poll Generation Status', () => {
    if (!jobId) return;
    const maxPolls = 10;
    for (let i = 0; i < maxPolls; i++) {
      const res = http.get(`${BASE_URL}/api/v1/generation/status/${jobId}`, { headers: authHeaders });
      check(res, {
        'poll ok': (r) => r.status === 200,
      });
      const body = res.json();
      const status = body.status || body.data?.status;
      if (status === 'completed' || status === 'failed') break;
      sleep(3);
    }
  });

  // Step 7: Export
  group('Export Project', () => {
    if (!projectId) return;
    const res = http.post(
      `${BASE_URL}/api/v1/projects/${projectId}/export`,
      JSON.stringify({ format: 'mp4' }),
      { headers: authHeaders }
    );
    check(res, {
      'export accepted': (r) => r.status === 200 || r.status === 202,
    });
    sleep(1);
  });
}
