// /backend/src/modules/realtime/bus.js
import EventEmitter from 'events';

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

// Conexiones SSE vivas por user_id
const connections = new Map(); // user_id -> Set(res)

export function attach(userId, res) {
  if (!connections.has(userId)) connections.set(userId, new Set());
  connections.get(userId).add(res);
  return () => {
    try { connections.get(userId)?.delete(res); } catch {}
  };
}

export function publishUser(userId, payload) {
  const set = connections.get(userId);
  if (!set || set.size === 0) return 0;
  const data = `event: message\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of set) {
    try { res.write(data); } catch {}
  }
  return set.size;
}

// Broadcast a varios user_ids
export function publishMany(userIds = [], payload) {
  let n = 0;
  for (const uid of userIds) n += publishUser(uid, payload);
  return n;
}

// Heartbeat a todos (opcional)
export function heartbeat() {
  for (const [_, set] of connections.entries()) {
    for (const res of set) {
      try { res.write(`event: ping\ndata: {}\n\n`); } catch {}
    }
  }
}
