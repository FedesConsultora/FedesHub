// /backend/src/modules/chat/controllers/health.controller.js
export const ping = (_req, res) => res.json({ ok: true, module: 'chat' });
