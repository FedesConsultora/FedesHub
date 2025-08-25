// /backend/src/modules/calendario/controllers/health.controller.js
export const ping = (_req, res) => {
  res.json({ module: 'calendario', ok: true, time: new Date().toISOString() });
};
