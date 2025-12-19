// /backend/src/modules/celulas/services/celulas.service.js

// celulas.service.js — Reglas de negocio y conveniencias
import fs from 'fs/promises';
import path from 'path';
import {
  listEstados, listRolTipos, getEstadoByCodigo,
  createCelula, updateCelula, changeCelulaState,
  getCelulaById, listCelulas, listAsignaciones,
  assignRol, closeAsignacion, getClientesByCelula
} from '../repositories/celulas.repo.js';
import { initModels } from '../../../models/registry.js';

const models = await initModels();

export const catEstados = () => listEstados();
export const catRoles = () => listRolTipos();

export const svcCreate = (body) => createCelula(body);
export const svcUpdate = (id, patch) => updateCelula(id, patch);
export const svcChangeState = (id, estado_codigo) => changeCelulaState(id, estado_codigo);

export const svcDetail = (id) => getCelulaById(id);
export const svcList = (q) => listCelulas(q);

export const svcListAsignaciones = (celula_id) => listAsignaciones(celula_id);
export const svcAssignRol = (celula_id, body) => assignRol({ celula_id, ...body });
export const svcCloseAsignacion = (asignacion_id, body) => closeAsignacion(asignacion_id, body);

export const svcListClientes = (celula_id) => getClientesByCelula(celula_id);

function slugify(s = '') {
  return s.normalize('NFD').replace(/\p{Diacritic}+/gu, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 80) || 'celula'
}

export const svcUploadAvatar = async (id, file) => {
  const c = await getCelulaById(id);
  if (!c) throw Object.assign(new Error('Célula no encontrada'), { status: 404 });

  const slug = slugify(c.nombre);
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const filename = `celula_${slug}_${id}${ext}`;

  const publicDir = path.resolve('public/avatars');
  const fullPath = path.join(publicDir, filename);

  if (c.avatar_url && c.avatar_url.startsWith('/avatars/')) {
    const oldRelative = c.avatar_url.replace(/^\//, '');
    const oldPath = path.join(path.resolve('public'), oldRelative);
    if (oldPath !== fullPath) {
      try { await fs.unlink(oldPath); } catch (e) { /* ignore */ }
    }
  }

  await fs.mkdir(publicDir, { recursive: true });
  await fs.writeFile(fullPath, file.buffer);

  const avatarUrl = `/avatars/${filename}`;
  await models.Celula.update({ avatar_url: avatarUrl }, { where: { id } });

  return getCelulaById(id);
}

export const svcCoverage = async (celula_id) => {
  const c = await getCelulaById(celula_id);
  if (!c) throw Object.assign(new Error('Célula no encontrada'), { status: 404 });
  const active = (c.asignaciones || []).filter(a => !a.hasta);
  const has = (code) => active.some(a => a.rol_codigo === code);
  return {
    celula_id,
    has_diseno: has('analista_diseno'),
    has_cuentas: has('analista_cuentas'),
    has_audiovisual: has('analista_audiovisual'),
    complete: ['analista_diseno', 'analista_cuentas', 'analista_audiovisual'].every(has)
  };
};
