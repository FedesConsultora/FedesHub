// backend/src/modules/feders/controllers/feders.controller.js
import {
  listFedersQuerySchema, federIdParamSchema, createFederSchema, updateFederSchema, setFederActiveSchema,
  federIdRouteSchema, upsertModalidadSchema, bulkModalidadSchema, diaParamSchema,
  upsertFirmaPerfilSchema, bankIdParamSchema, createFederBancoSchema, updateFederBancoSchema,
  contactoIdParamSchema, createEmergenciaSchema, updateEmergenciaSchema, uploadAvatarSchema, updateFederSelfSchema
} from '../validators.js';

import {
  svcListEstados, svcListModalidadesTrabajo, svcListDiasSemana,
  svcListFeders, svcGetFeder, svcCreateFeder, svcUpdateFeder, svcSetFederActive, svcDeleteFeder,
  svcListFederModalidad, svcUpsertFederModalidad, svcBulkSetFederModalidad, svcRemoveFederModalidad, svcOverview,
  svcGetFirmaPerfil, svcUpsertFirmaPerfil,
  svcListBancos, svcCreateBanco, svcUpdateBanco, svcDeleteBanco,
  svcListEmergencias, svcCreateEmergencia, svcUpdateEmergencia, svcDeleteEmergencia, svcUploadAvatar, svcGetFederByUserId
} from '../services/feders.service.js';
import { z } from 'zod';
const userIdParam = z.object({ userId: z.coerce.number().int().positive() });

export const getFederSelf = async (req, res, next) => {
  try {
    const userId =
      req.auth?.user?.id || req.user?.id || req.session?.user?.id || null;
    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    const f = await svcGetFederByUserId(userId);
    res.json(f);
  } catch (e) { next(e); }
};
export const getFederByUserIdCtrl = async (req, res, next) => {
  try {
    const { userId } = userIdParam.parse(req.params);
    const f = await svcGetFederByUserId(userId);
    res.json(f);
  } catch (e) { next(e); }
};
export const health = (_req, res) => res.json({ module: 'feders', ok: true });

export const patchFederSelf = async (req, res, next) => {
  try {
    const userId = req.auth?.user?.id || req.user?.id || req.session?.user?.id || null;
    if (!userId) return res.status(401).json({ error: 'No autenticado' });

    const fed = await svcGetFederByUserId(userId); // lanza 404 si no hay feder
    const body = updateFederSelfSchema.parse(req.body);
    const updated = await svcUpdateFeder(fed.id, body);
    res.json(updated);
  } catch (e) { next(e); }
};

// ---- Catálogos
export const listEstados = async (_req, res, next) => {
  try { res.json(await svcListEstados()); } catch (e) { next(e); }
};
export const listModalidadesTrabajo = async (_req, res, next) => {
  try { res.json(await svcListModalidadesTrabajo()); } catch (e) { next(e); }
};
export const listDias = async (_req, res, next) => {
  try { res.json(await svcListDiasSemana()); } catch (e) { next(e); }
};

// ---- Feders CRUD
export const listFeders = async (req, res, next) => {
  try {
    const q = listFedersQuerySchema.parse(req.query);
    res.json(await svcListFeders(q));
  } catch (e) { next(e); }
};

export const getFeder = async (req, res, next) => {
  try {
    const { id } = federIdParamSchema.parse(req.params);
    res.json(await svcGetFeder(id));
  } catch (e) { next(e); }
};

export const postFeder = async (req, res, next) => {
  try {
    const body = createFederSchema.parse(req.body);
    const created = await svcCreateFeder(body);
    res.status(201).json(created);
  } catch (e) { next(e); }
};

export const patchFeder = async (req, res, next) => {
  try {
    const { id } = federIdParamSchema.parse(req.params);
    const body = updateFederSchema.parse(req.body);
    const updated = await svcUpdateFeder(id, body);
    res.json(updated);
  } catch (e) { next(e); }
};

export const patchFederActive = async (req, res, next) => {
  try {
    const { id } = federIdParamSchema.parse(req.params);
    const { is_activo } = setFederActiveSchema.parse(req.body);
    res.json(await svcSetFederActive(id, is_activo));
  } catch (e) { next(e); }
};

export const deleteFederCtrl = async (req, res, next) => {
  try {
    const { id } = federIdParamSchema.parse(req.params);
    res.json(await svcDeleteFeder(id));
  } catch (e) { next(e); }
};

// ---- Modalidad por día
export const getFederModalidad = async (req, res, next) => {
  try {
    const { federId } = federIdRouteSchema.parse(req.params);
    res.json(await svcListFederModalidad(federId));
  } catch (e) { next(e); }
};

export const putFederModalidadBulk = async (req, res, next) => {
  try {
    const { federId } = federIdRouteSchema.parse(req.params);
    const { items } = bulkModalidadSchema.parse(req.body);
    res.json(await svcBulkSetFederModalidad(federId, items));
  } catch (e) { next(e); }
};

export const patchFederModalidad = async (req, res, next) => {
  try {
    const { federId } = federIdRouteSchema.parse(req.params);
    const body = upsertModalidadSchema.parse(req.body);
    res.json(await svcUpsertFederModalidad(federId, body));
  } catch (e) { next(e); }
};

export const deleteFederModalidad = async (req, res, next) => {
  try {
    const { federId } = federIdRouteSchema.parse(req.params);
    const { diaId } = diaParamSchema.parse(req.params);
    res.json(await svcRemoveFederModalidad(federId, diaId));
  } catch (e) { next(e); }
};

export const uploadAvatar = async (req, res, next) => {
  try {
    const { federId } = federIdRouteSchema.parse(req.params)

    // Verificación de seguridad: si no es admin (o tiene permiso explícito),
    // solo puede subir si es su propio federId.
    const perms = req.auth?.perms || []
    const isSelf = req.user?.feder_id === Number(federId)
    const isAdmin = perms.includes('feders.update') || perms.includes('*.*')

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Permiso insuficiente para cambiar este avatar' })
    }

    if (!req.file) return res.status(400).json({ error: 'Falta archivo "file"' })

    // Validar tipo/size con Zod
    uploadAvatarSchema.parse({ mimetype: req.file.mimetype, size: req.file.size })

    const updated = await svcUploadAvatar(federId, req.file)
    res.status(201).json(updated) // devolvemos el Feder actualizado
  } catch (e) { next(e) }
}
const overviewQuery = z.object({
  // priorizar ámbitos que consideramos “C-level” (coma-separado)
  prio_ambitos: z.string().optional(),              // ej: "c_level,direccion"
  celulas_estado: z.enum(['activa', 'pausada', 'cerrada']).optional().default('activa'),
  limit_celulas: z.coerce.number().int().min(1).max(500).optional().default(200)
});

export const overview = async (req, res, next) => {
  try {
    const { prio_ambitos, celulas_estado, limit_celulas } = overviewQuery.parse(req.query);
    const prio = prio_ambitos ? prio_ambitos.split(',').map(s => s.trim()).filter(Boolean) : undefined;
    res.json(await svcOverview({ prioAmbitos: prio, celulasEstado: celulas_estado, limitCelulas: limit_celulas }));
  } catch (e) { next(e); }
};

// ===== FirmaPerfil
export const getFirmaPerfil = async (req, res, next) => {
  try {
    const { federId } = federIdRouteSchema.parse(req.params);
    res.json(await svcGetFirmaPerfil(federId));
  } catch (e) { next(e); }
};
export const upsertFirmaPerfil = async (req, res, next) => {
  try {
    const { federId } = federIdRouteSchema.parse(req.params);
    const body = upsertFirmaPerfilSchema.parse(req.body);
    res.json(await svcUpsertFirmaPerfil(federId, body));
  } catch (e) { next(e); }
};

// ===== Bancos
export const listBancos = async (req, res, next) => {
  try {
    const { federId } = federIdRouteSchema.parse(req.params);
    res.json(await svcListBancos(federId));
  } catch (e) { next(e); }
};
export const createBanco = async (req, res, next) => {
  try {
    const { federId } = federIdRouteSchema.parse(req.params);
    const body = createFederBancoSchema.parse(req.body);
    res.status(201).json(await svcCreateBanco(federId, body));
  } catch (e) { next(e); }
};
export const patchBanco = async (req, res, next) => {
  try {
    const { federId } = federIdRouteSchema.parse(req.params);
    const { bankId } = bankIdParamSchema.parse(req.params);
    const body = updateFederBancoSchema.parse(req.body);
    res.json(await svcUpdateBanco(federId, bankId, body));
  } catch (e) { next(e); }
};
export const deleteBanco = async (req, res, next) => {
  try {
    const { federId } = federIdRouteSchema.parse(req.params);
    const { bankId } = bankIdParamSchema.parse(req.params);
    res.json(await svcDeleteBanco(federId, bankId));
  } catch (e) { next(e); }
};

// ===== Emergencias
export const listEmergencias = async (req, res, next) => {
  try {
    const { federId } = federIdRouteSchema.parse(req.params);
    res.json(await svcListEmergencias(federId));
  } catch (e) { next(e); }
};
export const createEmergencia = async (req, res, next) => {
  try {
    const { federId } = federIdRouteSchema.parse(req.params);
    const body = createEmergenciaSchema.parse(req.body);
    res.status(201).json(await svcCreateEmergencia(federId, body));
  } catch (e) { next(e); }
};
export const patchEmergencia = async (req, res, next) => {
  try {
    const { federId } = federIdRouteSchema.parse(req.params);
    const { contactoId } = contactoIdParamSchema.parse(req.params);
    const body = updateEmergenciaSchema.parse(req.body);
    res.json(await svcUpdateEmergencia(federId, contactoId, body));
  } catch (e) { next(e); }
};
export const deleteEmergencia = async (req, res, next) => {
  try {
    const { federId } = federIdRouteSchema.parse(req.params);
    const { contactoId } = contactoIdParamSchema.parse(req.params);
    res.json(await svcDeleteEmergencia(federId, contactoId));
  } catch (e) { next(e); }
};