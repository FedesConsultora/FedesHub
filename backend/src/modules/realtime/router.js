// /backend/src/modules/realtime/router.js
import { Router } from 'express';
import * as authMw from '../auth/middlewares/requireAuth.js';
import { attach, heartbeat } from './bus.js';
import { initModels } from '../../models/registry.js';
import { Op } from 'sequelize';

const router = Router();
const requireAuth = (authMw?.default ?? authMw?.requireAuth ?? authMw);
const m = await initModels();

// GET /api/realtime/stream
router.get('/stream', requireAuth, (req, res) => {
  // Cabeceras SSE
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // nginx
  });
  res.flushHeaders?.();

  // Primer "hola"
  res.write(`event: hello\ndata: {"ok":true}\n\n`);

  const detach = attach(req.user.id, res);

  // Heartbeat cada 25s
  const iv = setInterval(() => {
    try { res.write(`event: ping\ndata: {}\n\n`); } catch {}
  }, 25000);

  req.on('close', () => { clearInterval(iv); detach(); });
});

// opcional: endpoint de ping
router.get('/health', (_req, res) => res.json({ module: 'realtime', ok: true }));

// Heartbeat global cada 30s (multi-conexiones)
setInterval(() => heartbeat(), 30000);

/** Limpieza de TY P I N G expirado (cada 30s) */
setInterval(async () => {
  try {
    await m.ChatTyping.destroy({ where: { expires_at: { [Op.lt]: new Date() } } });
  } catch (e) {
    // silencioso
  }
}, 30000);

/** Decaimiento de P R E S E N C E (cada 60s)
 *  - >3 min sin update → away (si estaba online)
 *  - >15 min sin update → offline
 */
setInterval(async () => {
  try {
    const now = Date.now();
    const rows = await m.ChatPresence.findAll();
    for (const r of rows) {
      const last = new Date(r.last_seen_at || r.updated_at).getTime();
      const ms = now - last;
      let status = r.status;
      if (ms > 15*60*1000) status = 'offline';
      else if (ms > 3*60*1000 && r.status === 'online') status = 'away';
      if (status !== r.status) {
        await r.update({ status, updated_at: new Date() });
      }
    }
  } catch (e) {
    // silencioso
  }
}, 60000);

export default router;