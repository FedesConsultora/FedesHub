// /backend/src/modules/realtime/bus.js
import EventEmitter from 'events';

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

// Conexiones SSE vivas por user_id
const connections = new Map(); // user_id -> Set(res)

export function attach(userId, res, sid) {
  const uid = Number(userId);
  if (!connections.has(uid)) connections.set(uid, new Set());
  const set = connections.get(uid);
  set.add(res);

  return () => {
    try {
      const s = connections.get(uid);
      if (s) {
        s.delete(res);
        if (s.size === 0) connections.delete(uid);
      }
    } catch (err) {
      console.error(`[SSE:BUS] Error during detach:`, err.message);
    }
  };
}

export function publishUser(userId, payload) {
  const uid = Number(userId);
  const set = connections.get(uid);
  const eventName = payload?.type || 'message';

  if (!set || set.size === 0) return 0;

  const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;

  for (const res of set) {
    try {
      res.write(data);
    } catch (err) {
      console.error(`[SSE:BUS] Write FAILED for user ${uid}:`, err.message);
    }
  }
  return set.size;
}

// Broadcast a varios user_ids
export function publishMany(userIds = [], payload) {
  let n = 0;
  console.log(`[SSE:DEBUG] publishMany called for users: [${userIds.join(', ')}]`);
  for (const uid of userIds) n += publishUser(uid, payload);
  return n;
}

// Broadcast a TODOS los conectados (debug)
export function publishAll(payload) {
  let total = 0;
  const userIds = Array.from(connections.keys());
  console.log(`[SSE:DEBUG] publishAll called. Connected users: [${userIds.join(', ')}]`);
  for (const uid of userIds) total += publishUser(uid, payload);
  return total;
}

// Heartbeat a todos (opcional)
export function heartbeat() {
  for (const [uid, set] of connections.entries()) {
    for (const res of set) {
      try { res.write(`event: ping\ndata: {}\n\n`); } catch { }
    }
  }
}
