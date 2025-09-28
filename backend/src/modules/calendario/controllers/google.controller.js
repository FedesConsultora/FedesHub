// /backend/src/modules/calendario/controllers/google.controller.js
import { googleLinkSchema, googleSyncOneSchema, webhookHeadersSchema } from '../validators.js';
import {
  svcGoogleListCalendars, svcGoogleLink, svcGoogleSyncOne,
  svcGoogleStartWatch, svcGoogleStopWatch, svcGoogleWebhook
} from '../services/google.service.js';

import { initModels } from '../../../models/registry.js';
import pkg from '@googleapis/calendar';
const { google } = pkg;

const m = await initModels();

function oauthClient() {
  const { OAuth2 } = google.auth;
  return new OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT
  );
}

/* ========== OAuth dentro del módulo calendario ========== */

// GET /api/calendario/google/connect → redirige a Google
export const connectStart = async (req, res, _next) => {
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
  ];
  const client = oauthClient();
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
  });
  console.log('[cal:gconnect] start user=%s', req.user?.id);
  res.redirect(url);
};

// GET /api/calendario/google/callback → guarda/actualiza GoogleCuenta
export const connectCallback = async (req, res, next) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send('Missing code');

    const client = oauthClient();
    const { tokens } = await client.getToken(code);

    // Extra metadatos (email/sub) si vienen
    let email = null, google_user_id = null;
    if (tokens.id_token) {
      const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString());
      email = payload?.email ?? null;
      google_user_id = payload?.sub ?? null;
    } else if (tokens.access_token) {
      const info = await client.getTokenInfo(tokens.access_token);
      google_user_id = info?.sub ?? null;
    }

    // Upsert en GoogleCuenta
    let acct = await m.GoogleCuenta.findOne({ where: { user_id: req.user.id } });
    if (acct) {
      await acct.update({
        google_user_id: google_user_id || acct.google_user_id,
        email: email || acct.email,
        refresh_token_enc: tokens.refresh_token || acct.refresh_token_enc, // preserva si no vino
        token_scope: Array.isArray(tokens.scope) ? tokens.scope.join(' ') : (tokens.scope || acct.token_scope || null),
        connected_at: new Date(),
        revoked_at: null,
      });
    } else {
      acct = await m.GoogleCuenta.create({
        user_id: req.user.id,
        google_user_id,
        email,
        refresh_token_enc: tokens.refresh_token || null,
        token_scope: Array.isArray(tokens.scope) ? tokens.scope.join(' ') : (tokens.scope || null),
        connected_at: new Date(),
      });
    }

    console.log('[cal:gconnect] callback user=%s email=%s ok', req.user?.id, email);
    res.send(`<html><body style="font-family:system-ui;padding:16px">
      <h2>Google Calendar conectado ✅</h2>
      <p>Ya podés cerrar esta ventana.</p>
      <script>setTimeout(()=>window.close(),600)</script>
    </body></html>`);
  } catch (e) { next(e); }
};

/* ========== API Google ========== */
export const listRemoteCalendars = async (req, res, next) => {
  try {
    const out = await svcGoogleListCalendars(req.user);
    console.log('[cal:gcal] list user=%s -> %s', req.user?.id, out?.length ?? 'ok');
    res.json(out);
  } catch (e) { next(e); }
};

export const linkCalendar = async (req, res, next) => {
  try {
    const body = googleLinkSchema.parse(req.body);
    const out = await svcGoogleLink(body, req.user);
    console.log('[cal:gcal] link user=%s local=%s remote=%s', req.user?.id, body.calendario_local_id, body.google_calendar_id);
    res.status(201).json(out);
  } catch (e) { next(e); }
};

export const syncOne = async (req, res, next) => {
  try {
    const body = googleSyncOneSchema.parse(req.body);
    const out = await svcGoogleSyncOne(body, req.user);
    res.json(out);
  } catch (e) { next(e); }
};

export const startWatch = async (req, res, next) => {
  try {
    const calendario_local_id = Number(req.params.id);
    const out = await svcGoogleStartWatch(calendario_local_id, req.user);
    console.log('[cal:gwatch] start calendario_local_id=%s channel=%s',
      calendario_local_id, out?.channel?.channel_id || out?.channel?.id);
    res.json(out);
  } catch (e) { next(e); }
};

export const stopWatch = async (req, res, next) => {
  try {
    const { channel_id, resource_id } = req.body;
    const out = await svcGoogleStopWatch(channel_id, resource_id, req.user);
    console.log('[cal:gwatch] stop channel=%s resource=%s ok=%s', channel_id, resource_id, out?.stopped);
    res.json(out);
  } catch (e) { next(e); }
};

export const webhook = async (req, res, _next) => {
  try {
    const headers = webhookHeadersSchema.parse(req.headers);
    const out = await svcGoogleWebhook(headers);
    console.log('[cal:gwatch] webhook state=%s channel=%s resource=%s',
      headers['x-goog-resource-state'], headers['x-goog-channel-id'], headers['x-goog-resource-id']);
    res.status(200).end();
  } catch {
    res.status(200).end();
  }
};