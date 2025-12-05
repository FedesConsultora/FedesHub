'use strict';

/**
 * 0014-extend-permissions-kanban-all.js
 *
 * - Acciones nuevas:
 *     tareas:     kanban, label, comment, attach, relate
 *     asistencia: checkin, checkout, adjust, close
 * - Crea Permisos (Modulo×Accion) faltantes para esos módulos.
 * - Asignaciones:
 *     • tareas.kanban  -> todos los roles
 *     • tareas.{label,comment,attach,relate} -> roles que ya tengan tareas.create o tareas.update
 *     • asistencia.{checkin,checkout} -> rol "Feder" (si existe)
 *     • asistencia.{adjust,close}     -> rol "RRHH"  (si existe)
 *     • Admin -> todos los permisos nuevos (por si el seed previo no lo cubre)
 */

async function map(qi, table, keyCol = 'codigo', idCol = 'id') {
  const [rows] = await qi.sequelize.query(`SELECT ${idCol} AS id, ${keyCol} AS key FROM "${table}"`);
  return Object.fromEntries(rows.map(r => [r.key, r.id]));
}

async function mapByName(qi, table, nameCol = 'nombre', idCol = 'id') {
  const [rows] = await qi.sequelize.query(`SELECT ${idCol} AS id, ${nameCol} AS key FROM "${table}"`);
  return Object.fromEntries(rows.map(r => [r.key, r.id]));
}

module.exports = {
  async up(qi /*, Sequelize */) {
    const now = new Date();

    // 1) Asegurar acciones faltantes
    const neededActions = [
      // tareas
      'kanban', 'label', 'comment', 'attach', 'relate',
      // asistencia
      'checkin', 'checkout', 'adjust', 'close'
    ];

    const [haveActsRows] = await qi.sequelize.query(
      `SELECT codigo FROM "Accion" WHERE codigo IN (:codes)`,
      { replacements: { codes: neededActions } }
    );
    const haveActs = new Set(haveActsRows.map(r => r.codigo));
    const missingActs = neededActions
      .filter(c => !haveActs.has(c))
      .map(c => ({ codigo: c, nombre: c, descripcion: null, created_at: now, updated_at: now }));
    if (missingActs.length) {
      await qi.bulkInsert('Accion', missingActs, { ignoreDuplicates: true });
    }

    // maps actualizados
    const modId = await map(qi, 'Modulo', 'codigo', 'id');
    const actId = await map(qi, 'Accion', 'codigo', 'id');
    const roleIdByName = await mapByName(qi, 'Rol', 'nombre', 'id');

    // 2) Crear Permisos (Modulo×Accion) necesarios
    const neededPerms = [
      // tareas
      ['tareas', 'kanban'],
      ['tareas', 'label'],
      ['tareas', 'comment'],
      ['tareas', 'attach'],
      ['tareas', 'relate'],
      // asistencia
      ['asistencia', 'checkin'],
      ['asistencia', 'checkout'],
      ['asistencia', 'adjust'],
      ['asistencia', 'close'],
    ]
      // sólo las que existan ambos extremos (por seguridad)
      .filter(([m, a]) => modId[m] && actId[a])
      .map(([m, a]) => ({
        modulo_id: modId[m],
        accion_id: actId[a],
        nombre: `${m}.${a}`,
        descripcion: null,
        created_at: now,
        updated_at: now
      }));

    if (neededPerms.length) {
      // filtrar existentes
      const pairs = neededPerms.map(p => [p.modulo_id, p.accion_id]);
      const tupleList = pairs.map(() => '(?,?)').join(',');
      const [havePermRows] = await qi.sequelize.query(
        `SELECT modulo_id, accion_id FROM "Permiso"
         WHERE (modulo_id, accion_id) IN (${tupleList})`,
        { replacements: pairs.flat() }
      );
      const haveSet = new Set(havePermRows.map(r => `${r.modulo_id}:${r.accion_id}`));
      const missingPerms = neededPerms.filter(p => !haveSet.has(`${p.modulo_id}:${p.accion_id}`));
      if (missingPerms.length) {
        await qi.bulkInsert('Permiso', missingPerms, { ignoreDuplicates: true });
      }
    }

    // 3) Map de Permiso por clave "mod.act"
    const [permRowsAll] = await qi.sequelize.query(`
      SELECT p.id, m.codigo AS modulo, a.codigo AS accion
      FROM "Permiso" p
      JOIN "Modulo" m ON m.id = p.modulo_id
      JOIN "Accion" a ON a.id = p.accion_id
    `);
    const permIdByKey = {};
    for (const r of permRowsAll) permIdByKey[`${r.modulo}.${r.accion}`] = r.id;

    // 4) Grants a generar
    const grants = [];

    // 4.a) tareas.kanban -> todos los roles
    const pidKanban = permIdByKey['tareas.kanban'];
    if (pidKanban) {
      const [allRoles] = await qi.sequelize.query(`SELECT id FROM "Rol"`);
      for (const r of allRoles) grants.push([r.id, pidKanban]);
    }

    // 4.b) tareas extras -> roles que ya tengan tareas.create o tareas.update
    const tareasExtras = ['label', 'comment', 'attach', 'relate']
      .map(a => permIdByKey[`tareas.${a}`])
      .filter(Boolean);

    if (tareasExtras.length) {
      const [rolesWithCRU] = await qi.sequelize.query(`
        SELECT DISTINCT r.id AS rol_id
        FROM "Rol" r
        JOIN "RolPermiso" rp ON rp.rol_id = r.id
        JOIN "Permiso" p ON p.id = rp.permiso_id
        JOIN "Modulo" m ON m.id = p.modulo_id
        JOIN "Accion" a ON a.id = p.accion_id
        WHERE m.codigo = 'tareas' AND a.codigo IN ('create','update')
      `);
      const roleIds = rolesWithCRU.map(x => x.rol_id);
      for (const rid of roleIds) {
        for (const pid of tareasExtras) grants.push([rid, pid]);
      }
    }

    // 4.c) asistencia: checkin/checkout -> NivelC (colaboradores) ; adjust/close -> NivelB (líderes)
    const pidAsisCheckIn = permIdByKey['asistencia.checkin'];
    const pidAsisCheckOut = permIdByKey['asistencia.checkout'];
    const pidAsisAdjust = permIdByKey['asistencia.adjust'];
    const pidAsisClose = permIdByKey['asistencia.close'];

    const ridNivelC = roleIdByName['NivelC'];
    const ridNivelB = roleIdByName['NivelB'];
    const ridNivelA = roleIdByName['NivelA'];

    // NivelC: check-in/out básico
    if (ridNivelC) {
      if (pidAsisCheckIn) grants.push([ridNivelC, pidAsisCheckIn]);
      if (pidAsisCheckOut) grants.push([ridNivelC, pidAsisCheckOut]);
    }
    // NivelB: ajustes y cierre
    if (ridNivelB) {
      if (pidAsisAdjust) grants.push([ridNivelB, pidAsisAdjust]);
      if (pidAsisClose) grants.push([ridNivelB, pidAsisClose]);
      if (pidAsisCheckIn) grants.push([ridNivelB, pidAsisCheckIn]);
      if (pidAsisCheckOut) grants.push([ridNivelB, pidAsisCheckOut]);
    }

    // 4.d) NivelA (Admin): todos los permisos NUEVOS
    if (ridNivelA) {
      const newPermKeys = [
        'tareas.kanban', 'tareas.label', 'tareas.comment', 'tareas.attach', 'tareas.relate',
        'asistencia.checkin', 'asistencia.checkout', 'asistencia.adjust', 'asistencia.close'
      ];
      for (const k of newPermKeys) {
        const pid = permIdByKey[k];
        if (pid) grants.push([ridNivelA, pid]);
      }
    }

    // 5) Insertar grants faltantes en RolPermiso
    if (grants.length) {
      const tuples = grants.map(() => '(?,?)').join(',');
      const [haveRP] = await qi.sequelize.query(
        `SELECT rol_id, permiso_id FROM "RolPermiso"
         WHERE (rol_id, permiso_id) IN (${tuples})`,
        { replacements: grants.flat() }
      );
      const haveSetRP = new Set(haveRP.map(r => `${r.rol_id}:${r.permiso_id}`));
      const missingRP = grants
        .filter(([r, p]) => !haveSetRP.has(`${r}:${p}`))
        .map(([rol_id, permiso_id]) => ({ rol_id, permiso_id, created_at: now }));
      if (missingRP.length) {
        await qi.bulkInsert('RolPermiso', missingRP, { ignoreDuplicates: true });
      }
    }
  },

  async down(/* qi */) {
    // No hacemos down para no romper asignaciones existentes.
    // Si necesitás reversión, podés borrar manualmente de RolPermiso/Permiso/Accion según los códigos añadidos.
  }
};
