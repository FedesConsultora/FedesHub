// 0002-auth-permissions-map
'use strict';

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // ---- Maps base (módulos, acciones, roles)
    const [mods] = await queryInterface.sequelize.query(`SELECT id, codigo FROM "Modulo"`);
    const [acts] = await queryInterface.sequelize.query(`SELECT id, codigo FROM "Accion"`);
    const [roles] = await queryInterface.sequelize.query(`SELECT id, nombre FROM "Rol"`);

    const modId = Object.fromEntries(mods.map(m => [m.codigo, m.id]));
    const actId = Object.fromEntries(acts.map(a => [a.codigo, a.id]));
    const roleId = Object.fromEntries(roles.map(r => [r.nombre, r.id]));

    const ALL_MODS = Object.keys(modId);
    const ALL_ACTS = Object.keys(actId); // dinámico (por si agregás nuevas acciones)

    const READ = ['read'];
    const CRUD = ['create', 'read', 'update', 'delete'];
    const CRU = ['create', 'read', 'update'];

    // ---- 1) Crear TODOS los permisos (Módulo x Acción)
    //      (idempotente: ignoreDuplicates)
    const permsToInsert = [];
    for (const m of ALL_MODS) {
      for (const a of ALL_ACTS) {
        permsToInsert.push({
          modulo_id: modId[m],
          accion_id: actId[a],
          nombre: `${m}.${a}`,
          descripcion: null,
          created_at: now, updated_at: now
        });
      }
    }
    await queryInterface.bulkInsert('Permiso', permsToInsert, { ignoreDuplicates: true });

    // ---- 2) Matriz simplificada: 3 niveles jerárquicos
    //      NivelA: Acceso total (equivale a Admin anterior)
    //      NivelB: Líder - puede aprobar, asignar y ver reportes
    //      NivelC: Colaborador - CRUD básico
    const roleMatrix = {
      NivelA: { '*': ALL_ACTS },

      NivelB: {
        // Acceso completo a estos módulos
        tareas: [...CRU, 'delete', 'approve', 'assign'],
        ausencias: CRU,
        clientes: CRU,
        calendario: CRU,
        // Lectura + reportes
        asistencia: ['read', 'report'],
        feders: ['read', 'update'],
        celulas: CRU,
        cargos: CRU,
        notificaciones: CRU,
        chat: CRU
      },

      RRHH: {
        // Acceso completo a estos módulos (Basado en NivelB)
        tareas: [...CRU, 'delete', 'approve', 'assign'],
        ausencias: ALL_ACTS,
        rrhh: ALL_ACTS,
        clientes: CRU,
        calendario: CRU,
        asistencia: ['read', 'report'],
        feders: ['read', 'update'],
        celulas: CRU,
        cargos: CRU,
        notificaciones: CRU,
        chat: CRU
      },

      NivelC: {
        tareas: CRU,
        calendario: CRU,
        ausencias: ['create', 'read'],
        clientes: READ,
        asistencia: READ,
        celulas: READ,
        feders: READ,
        notificaciones: CRU,
        chat: CRU
      }
    };

    // ---- 3) Armar permisos efectivos por rol aplicando:
    //         (a) BASELINE: read en TODOS los módulos para TODOS los roles
    //         (b) BASELINE: notificaciones.update para TODOS los roles
    //         (c) roleMatrix para acciones extra
    const eff = new Map(); // rol -> (mod -> Set(acciones))

    const ensure = (r, m) => {
      if (!eff.has(r)) eff.set(r, new Map());
      const mm = eff.get(r);
      if (!mm.has(m)) mm.set(m, new Set());
      return mm.get(m);
    };

    // (a) Lectura global
    for (const r of Object.keys(roleId)) {
      for (const m of ALL_MODS) {
        ensure(r, m).add('read');
      }
    }

    // (b) Update en notificaciones para TODOS
    if (modId['notificaciones'] && actId['update']) {
      for (const r of Object.keys(roleId)) {
        ensure(r, 'notificaciones').add('update');
      }
    }

    // (c) Aplicar la matriz específica
    const addActs = (r, m, acts) => {
      const set = ensure(r, m);
      for (const a of acts) set.add(a);
    };

    for (const [rolName, matrix] of Object.entries(roleMatrix)) {
      if (!roleId[rolName]) continue;

      // comodín '*'
      if (matrix['*']) {
        for (const m of ALL_MODS) addActs(rolName, m, matrix['*']);
      }
      for (const [m, acts] of Object.entries(matrix)) {
        if (m === '*') continue;
        if (!modId[m]) continue;
        addActs(rolName, m, acts);
      }
    }

    // ---- 4) Resolver ids de Permiso y generar inserts
    const [permRows] = await queryInterface.sequelize.query(
      `SELECT id, modulo_id, accion_id FROM "Permiso"`
    );

    const modById = Object.fromEntries(Object.entries(modId).map(([k, v]) => [v, k]));
    const actById = Object.fromEntries(Object.entries(actId).map(([k, v]) => [v, k]));
    const permIdByKey = {};
    for (const p of permRows) {
      const m = modById[p.modulo_id];
      const a = actById[p.accion_id];
      if (m && a) permIdByKey[`${m}.${a}`] = p.id;
    }

    const rolPermisos = [];
    for (const [rName, modMap] of eff.entries()) {
      const rId = roleId[rName];
      if (!rId) continue;
      for (const [m, acts] of modMap.entries()) {
        for (const a of acts) {
          const pid = permIdByKey[`${m}.${a}`];
          if (pid) rolPermisos.push({ rol_id: rId, permiso_id: pid, created_at: now });
        }
      }
    }

    await queryInterface.bulkInsert('RolPermiso', rolPermisos, { ignoreDuplicates: true });
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('RolPermiso', null, {});
    await queryInterface.bulkDelete('Permiso', null, {});
  }
};
