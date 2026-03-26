import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { BASE_URL, AUTH_TOKEN } from './config.js';

const wsErrors = new Counter('ws_errors');
const wsMessagesReceived = new Counter('ws_messages_received');

const WS_URL = BASE_URL.replace(/^http/, 'ws');

export const options = {
  vus: 100,
  duration: '1m',
  thresholds: {
    ws_errors: ['count<10'],
    ws_messages_received: ['count>0'],
  },
};

export default function () {
  const url = `${WS_URL}/ws?token=${AUTH_TOKEN}`;
  const projectRoom = `project-room-${(__VU % 10) + 1}`;

  const res = ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
      socket.send(JSON.stringify({
        type: 'join',
        room: projectRoom,
      }));
    });

    socket.on('message', (data) => {
      wsMessagesReceived.add(1);
      try {
        const msg = JSON.parse(data);
        check(msg, {
          'message has type': (m) => !!m.type,
        });
      } catch (_) {
        // non-JSON message, still valid
      }
    });

    socket.on('error', (e) => {
      wsErrors.add(1);
      console.error(`WS error VU ${__VU}: ${e.error()}`);
    });

    // Keep connection alive for a portion of the test
    socket.setTimeout(() => {
      socket.send(JSON.stringify({
        type: 'ping',
      }));
    }, 5000);

    socket.setTimeout(() => {
      socket.send(JSON.stringify({
        type: 'leave',
        room: projectRoom,
      }));
      socket.close();
    }, 10000);
  });

  check(res, {
    'ws status 101': (r) => r && r.status === 101,
  });

  sleep(1);
}
