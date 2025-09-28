// /backend/src/modules/chat/controllers/chat.controller.js
import { initModels } from '../../../models/registry.js';
import {
  listCatalogQuery, listCanalesQuery, upsertCanalSchema, updateCanalSettingsSchema,
  memberUpsertSchema, memberPatchSchema,
  listMessagesQuery, postMessageSchema, editMessageSchema, reactionSchema,
  readChannelSchema, saveSchema, pinSchema, typingSchema, presenceSchema,
  createInvitationSchema, invitationTokenParam, meetingSchema,
  idParam, midParam
} from '../validators.js';

import {
  svcCatalogos, svcListCanales, svcUpsertCanal, svcArchiveCanal, svcUpdateCanalSettings,
  svcListMiembros, svcAddOrUpdateMiembro, svcRemoveMiembro, svcJoin, svcLeave,
  svcListMessages, svcPostMessage, svcEditMessage, svcDeleteMessage,
  svcReact, svcPin, svcSave, svcFollowThread, svcSetRead,
  svcSetPresence, svcTyping,
  svcInvite, svcAcceptInvitation, svcDeclineInvitation,
  svcScheduleMeeting, svcListDmCandidates
} from '../services/chat.service.js';

import { saveUploadedFiles } from '../../../infra/storage/index.js'

import { listChannelAttachments } from '../repositories/attachments.repo.js'
const m = await initModels();

await initModels();

export const health = (_req, res) => res.json({ module: 'chat', ok: true });

export const getDmCandidates = async (req, res, next) => {
  try {
    const rows = await svcListDmCandidates(req.user);
    res.json(rows);
  } catch (e) { next(e); }
};

// ------ Catálogo
export const getCatalog = async (_req, res, next) => {
  try { res.json(await svcCatalogos()); } catch (e) { next(e); }
};

// ------ Canales
export const getCanales = async (req, res, next) => {
  try {
    const q = listCanalesQuery.parse(req.query);
    res.json(await svcListCanales(q, req.user));
  } catch (e) { next(e); }
};

export const postCanal = async (req, res, next) => {
  try {
    const body = upsertCanalSchema.parse(req.body);
    const row = await svcUpsertCanal(body, req.user);
    res.status(201).json(row);
  } catch (e) { next(e); }
};

export const putCanal = async (req, res, next) => {
  try {
    const body = upsertCanalSchema.parse({ ...req.body, id: Number(req.params.id) });
    res.json(await svcUpsertCanal(body, req.user));
  } catch (e) { next(e); }
};

export const patchArchiveCanal = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { on } = { on: !!req.body?.on };
    res.json(await svcArchiveCanal(id, on));
  } catch (e) { next(e); }
};

export const patchCanalSettings = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const body = updateCanalSettingsSchema.parse(req.body);
    res.json(await svcUpdateCanalSettings(id, body));
  } catch (e) { next(e); }
};


export const patchCanalAvatar = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params)
    const file = req.file || (req.files || [])[0]             // acepta single o array
    if (!file) return res.status(400).json({ error: 'Falta archivo (field "file")' })

    // 👉 guardar en LOCAL (dominio chat)
    const metas = await saveUploadedFiles([file], ['chat', `canal-${id}`, 'avatar'], 'chat')
    const meta = metas?.[0]
    const imagen_url = meta?.webContentLink || meta?.webViewLink
    if (!imagen_url) throw Object.assign(new Error('Error al subir avatar'), { status: 500 })

    const row = await svcUpdateCanalSettings(id, { imagen_url })
    res.json(row)
  } catch (e) { next(e) }
}


// ------ Miembros
export const getMiembros = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    res.json(await svcListMiembros(id));
  } catch (e) { next(e); }
};

export const postMiembro = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const body = memberUpsertSchema.parse(req.body);
    res.status(201).json(await svcAddOrUpdateMiembro(id, body, req.user));
  } catch (e) { next(e); }
};

export const patchMiembro = async (req, res, next) => {
  try {
    const { id, user_id } = { ...req.params, user_id: Number(req.params.user_id) };
    const body = memberPatchSchema.parse(req.body);
    res.json(await svcAddOrUpdateMiembro(Number(id), { user_id, ...body }, req.user));
  } catch (e) { next(e); }
};

export const deleteMiembro = async (req, res, next) => {
  try {
    const { id, user_id } = { ...req.params, user_id: Number(req.params.user_id) };
    res.json(await svcRemoveMiembro(Number(id), Number(user_id)));
  } catch (e) { next(e); }
};

export const postJoin = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    res.json(await svcJoin(id, req.user));
  } catch (e) { next(e); }
};

export const postLeave = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    res.json(await svcLeave(id, req.user));
  } catch (e) { next(e); }
};

// ------ Mensajes
export const getMessages = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const q = listMessagesQuery.parse(req.query);
    res.json(await svcListMessages(id, q, req.user));
  } catch (e) { next(e); }
};

export const postMessage = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);

    const body = postMessageSchema.parse({
      ...req.body,
      __has_files: (req.files?.length || 0) > 0,  // 👈 clave
      ...(typeof req.body?.body_json === 'string'
        ? { body_json: safeParseJSON(req.body.body_json) }
        : {})
    });

    const row = await svcPostMessage(id, body, req.user, req.files || []);
    res.status(201).json(row);
  } catch (e) { next(e); }
};


function safeParseJSON(s) {
  try { return JSON.parse(s); } catch { return undefined; }
}

export const putMessage = async (req, res, next) => {
  try {
    const { id } = midParam.parse(req.params);
    const body = editMessageSchema.parse(req.body);
    res.json(await svcEditMessage(id, body, req.user));
  } catch (e) { next(e); }
};

export const deleteMessage = async (req, res, next) => {
  try {
    const { id } = midParam.parse(req.params);
    res.json(await svcDeleteMessage(id, req.user));
  } catch (e) { next(e); }
};

export const postReact = async (req, res, next) => {
  try {
    const { id } = midParam.parse(req.params);
    const { emoji, on } = { ...reactionSchema.parse(req.body), on: req.body?.on !== false };
    res.json(await svcReact(id, emoji, on, req.user));
  } catch (e) { next(e); }
};

export const postPin = async (req, res, next) => {
  try {
    const { id } = midParam.parse(req.params); // mensaje_id
    const { on, orden } = pinSchema.parse(req.body);
    // ✅ permitimos que canal_id no venga; el servicio resuelve por mensaje
    const canal_id = req.body?.canal_id ? Number(req.body.canal_id) : null;
    res.json(await svcPin(canal_id, id, on, orden, req.user));
  } catch (e) { next(e); }
};

export const postSave = async (req, res, next) => {
  try {
    const { id } = midParam.parse(req.params); // mensaje_id
    const { on } = saveSchema.parse(req.body);
    res.json(await svcSave(id, on, req.user));
  } catch (e) { next(e); }
};

export const postFollowThread = async (req, res, next) => {
  try {
    const { root_id } = { root_id: Number(req.params.root_id) };
    const { on } = saveSchema.parse(req.body);
    res.json(await svcFollowThread(root_id, on, req.user));
  } catch (e) { next(e); }
};

export const postRead = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { last_read_msg_id } = readChannelSchema.parse(req.body);
    res.json(await svcSetRead(id, last_read_msg_id, req.user));
  } catch (e) { next(e); }
};

// ------ Presencia / Typing
export const postPresence = async (req, res, next) => {
  try {
    const body = presenceSchema.parse(req.body);
    res.json(await svcSetPresence(body, req.user));
  } catch (e) { next(e); }
};

export const postTyping = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { on, ttl_seconds } = typingSchema.parse(req.body);
    res.json(await svcTyping(id, on, ttl_seconds, req.user));
  } catch (e) { next(e); }
};

// ------ Invitaciones
export const postInvitation = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const body = createInvitationSchema.parse(req.body);
    const row = await svcInvite(id, body, req.user);
    res.status(201).json(row);
  } catch (e) { next(e); }
};

export const postAcceptInvitation = async (req, res, next) => {
  try {
    const { token } = invitationTokenParam.parse(req.params);
    res.json(await svcAcceptInvitation(token, req.user));
  } catch (e) { next(e); }
};

export const postDeclineInvitation = async (req, res, next) => {
  try {
    const { token } = invitationTokenParam.parse(req.params);
    res.json(await svcDeclineInvitation(token, req.user));
  } catch (e) { next(e); }
};

// ------ Meetings
export const postMeeting = async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const body = meetingSchema.parse(req.body);
    const r = await svcScheduleMeeting(id, body, req.user);
    res.status(201).json(r);
  } catch (e) { next(e); }
};

export async function   listAttachments(req, res, next) {
  try {
    const canal_id = Number(req.params.id)
    const user = req.user || {}
    const t = req.t // si tu middleware de tx la inyecta

    if (!canal_id) return res.status(400).json({ error: 'canal_id inválido' })
    if (!user?.id)  return res.status(401).json({ error: 'No autenticado' })

    // Debe ser miembro del canal
    const me = await m.ChatCanalMiembro.findOne({
      where: { canal_id, user_id: user.id },
      transaction: t
    })
    if (!me) return res.status(403).json({ error: 'No sos miembro del canal' })

    const items = await listChannelAttachments(canal_id, req.query || {}, t)
    return res.json(items)
  } catch (e) { next(e) }
}