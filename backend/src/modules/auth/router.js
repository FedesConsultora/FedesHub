import { Router } from 'express';
const router = Router();

router.get('/health', (_req, res) => res.json({ module: 'auth', ok: true }));

export default router;
