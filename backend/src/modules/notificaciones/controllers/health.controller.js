import { transporter } from '../services/mailer.js';
import { checkFCM } from '../../../lib/push/fcm.js';

export const smtp = async (_req, res) => {
  try {
    await transporter.verify();
    res.json({ smtp: 'ok' });
  } catch (e) {
    res.status(500).json({ smtp: 'fail', error: e?.message });
  }
};

export const push = async (_req, res) => {
  try {
    const info = await checkFCM();
    res.json({ push: 'ok', ...info });
  } catch (e) {
    res.status(500).json({ push: 'fail', error: e?.message });
  }
};
