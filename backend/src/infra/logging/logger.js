// Sin dependencias externas: JSON line logging con prefijos y requestId
const redactKeys = new Set([
  'password', 'password_hash', 'token', 'refresh_token', 'refresh_token_enc',
  'authorization', 'cookie'
]);

function sanitize(obj, { depth = 3, maxLen = 1000 } = {}) {
  try {
    const seen = new WeakSet();
    const go = (v, d) => {
      if (v == null) return v;
      if (typeof v === 'string') return v.length > maxLen ? v.slice(0, maxLen) + '…' : v;
      if (typeof v !== 'object') return v;
      if (seen.has(v)) return '[circular]';
      if (d <= 0) return '[depth]';
      seen.add(v);
      if (Array.isArray(v)) return v.slice(0, 50).map(x => go(x, d - 1));
      const o = {};
      for (const [k, val] of Object.entries(v)) {
        if (redactKeys.has(k.toLowerCase())) { o[k] = '[redacted]'; continue; }
        o[k] = go(val, d - 1);
      }
      return o;
    };
    return go(obj, depth);
  } catch { return '[unserializable]'; }
}

function ts() {
  return new Date().toISOString();
}

function baseLog(level, msg, ctx) {
  const line = { t: ts(), level, msg, ...ctx };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(line));
}

export function makeReqLogger({ requestId, user, route }) {
  const common = { requestId, user_id: user?.id ?? null, feder_id: user?.feder_id ?? user?.feder?.id ?? null, route };
  return {
    info:  (msg, ctx={}) => baseLog('info',  msg, { ...common, ...sanitize(ctx) }),
    warn:  (msg, ctx={}) => baseLog('warn',  msg, { ...common, ...sanitize(ctx) }),
    error: (msg, ctx={}) => baseLog('error', msg, { ...common, ...sanitize(ctx) }),
    debug: (msg, ctx={}) => baseLog('debug', msg, { ...common, ...sanitize(ctx) }),
  };
}

export const log = {
  info:  (msg, ctx={}) => baseLog('info',  msg, sanitize(ctx)),
  warn:  (msg, ctx={}) => baseLog('warn',  msg, sanitize(ctx)),
  error: (msg, ctx={}) => baseLog('error', msg, sanitize(ctx)),
  debug: (msg, ctx={}) => baseLog('debug', msg, sanitize(ctx)),
};
