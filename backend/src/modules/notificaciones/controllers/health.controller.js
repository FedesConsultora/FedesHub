import { transporter } from '../services/mailer.js';
import { initModels } from '../../../models/registry.js';

await initModels();

export const smtp = async (_req, res) => {
  try {
    await transporter.verify();
    res.json({ ok: true, transport: 'smtp' });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
};

export const push = async (_req, res) => {
  const provider = process.env.PUSH_PROVIDER || 'fcm';
  const hasKey = !!process.env.FCM_SERVER_KEY || !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  res.json({
    ok: hasKey,
    provider,
    configured: hasKey
  });
};
