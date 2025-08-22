'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();

    // Maps
    const [mods] = await queryInterface.sequelize.query(`SELECT id, codigo FROM "Modulo"`);
    const [acts] = await queryInterface.sequelize.query(`SELECT id, codigo FROM "Accion"`);
    const [roles] = await queryInterface.sequelize.query(`SELECT id, nombre FROM "Rol"`);

    const modId = Object.fromEntries(mods.map(m => [m.codigo, m.id]));
    const actId = Object.fromEntries(acts.map(a => [a.codigo, a.id]));
    const roleId = Object.fromEntries(roles.map(r => [r.nombre, r.id]));

    const ALL_ACTS = Object.keys(actId); // todas las acciones dinámicas
    const READ = ['read'];
    const CRUD = ['create','read','update','delete'];
    const CRU  = ['create','read','update'];

    // 1) Crear todos los permisos (Modulo x Accion)
    const permsToInsert = [];
    for (const m of Object.keys(modId)) {
      for (const a of Object.keys(actId)) {
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

    // Mapa (rol -> módulos -> acciones)
    const roleMatrix = {
      Admin: { '*': ALL_ACTS },

      CLevel: { '*': READ },

      RRHH: {
        ausencias: ALL_ACTS,
        feders: READ,
        asistencia: READ,
        calendario: READ,
        tareas: READ,
        clientes: READ,
        cargos: READ,
        notificaciones: READ,
      },

      CuentasAnalista: {
        clientes: CRU,
        tareas: CRU,
        calendario: CRU,
        feders: READ,
        ausencias: READ
      },

      // Analistas separados
      AnalistaDiseno: {
        tareas: CRU,
        calendario: CRU,
        clientes: READ,
        feders: READ
      },
      AnalistaComunicacion: {
        tareas: CRU,
        calendario: CRU,
        clientes: READ,
        feders: READ
      },
      AnalistaAudiovisual: {
        tareas: CRU,
        calendario: CRU,
        clientes: READ,
        feders: READ
      },

      // Tridentes (marketing/performance/tecnología)
      TriMarketing: {
        tareas: [...CRU,'approve','assign'],
        calendario: CRU,
        clientes: CRU,
        asistencia: ['read','report'],
        feders: READ,
        ausencias: READ
      },
      TriPerformance: {
        tareas: [...CRU,'approve','assign'],
        calendario: CRU,
        clientes: CRU,
        asistencia: ['read','report'],
        feders: READ,
        ausencias: READ
      },
      TriTecnologia: {
        tareas: [...CRU,'approve','assign'],
        calendario: CRU,
        clientes: CRU,
        asistencia: ['read','report'],
        feders: READ,
        ausencias: READ
      },

      Feder: {
        tareas: CRU,
        calendario: CRU,
        ausencias: ['create','read'],
        clientes: READ
      },

      Onboarding: {
        calendario: CRU,
        tareas: READ,
        clientes: READ,
        ausencias: READ
      }
    };

    // Ayuda para obtener id de permiso
    const [permRows] = await queryInterface.sequelize.query(`SELECT id, modulo_id, accion_id FROM "Permiso"`);
    const permKey = (m,a) => `${m}.${a}`;
    const permIdByKey = {};
    for (const p of permRows) {
      const m = Object.keys(modId).find(k => modId[k] === p.modulo_id);
      const a = Object.keys(actId).find(k => actId[k] === p.accion_id);
      if (m && a) permIdByKey[permKey(m,a)] = p.id;
    }

    // Construir asignación rol -> permisos
    const rolPermisos = [];
    for (const [rolName, matrix] of Object.entries(roleMatrix)) {
      const rId = roleId[rolName];
      if (!rId) continue;

      if (matrix['*']) {
        for (const m of Object.keys(modId)) {
          for (const a of matrix['*']) {
            const pid = permIdByKey[permKey(m,a)];
            if (pid) rolPermisos.push({ rol_id: rId, permiso_id: pid, created_at: now });
          }
        }
      }
      for (const [m, acts] of Object.entries(matrix)) {
        if (m === '*') continue;
        for (const a of acts) {
          const pid = permIdByKey[permKey(m,a)];
          if (pid) rolPermisos.push({ rol_id: rId, permiso_id: pid, created_at: now });
        }
      }
    }

    await queryInterface.bulkInsert('RolPermiso', rolPermisos, { ignoreDuplicates: true });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('RolPermiso', null, {});
    await queryInterface.bulkDelete('Permiso', null, {});
  }
};
