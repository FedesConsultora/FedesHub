// 0015 - Cargos core (idempotente)
'use strict';

/**
 * 0015 - Cargos core (idempotente)
 * Actualizado: usa "Desarrollador Fullstack" (en vez de "Desarrollador").
 */

async function ensureAmbitos(queryInterface, t) {
  await queryInterface.sequelize.query(`
    INSERT INTO "CargoAmbito"(codigo, nombre, descripcion, created_at, updated_at)
    VALUES
      ('organico','Orgánico',NULL, now(), now()),
      ('cliente','Cliente',NULL, now(), now())
    ON CONFLICT (codigo) DO NOTHING;
  `, { transaction: t });

  const [rows] = await queryInterface.sequelize.query(
    `SELECT id, codigo FROM "CargoAmbito" WHERE codigo IN ('organico','cliente')`,
    { transaction: t }
  );
  const map = Object.fromEntries(rows.map(r => [r.codigo, r.id]));
  if (!map.organico || !map.cliente) {
    throw new Error('Faltan ámbitos requeridos: organico/cliente');
  }
  return map;
}

async function ensureByNombre(queryInterface, table, rows, t) {
  if (!rows.length) return;
  const nombres = rows.map(r => r.nombre);
  const [exists] = await queryInterface.sequelize.query(
    `SELECT nombre FROM "${table}" WHERE nombre IN (:nombres)`,
    { transaction: t, replacements: { nombres } }
  );
  const have = new Set(exists.map(e => e.nombre));
  const missing = rows.filter(r => !have.has(r.nombre));
  if (missing.length) {
    await queryInterface.bulkInsert(table, missing, { transaction: t });
  }
}

module.exports = {
  async up (queryInterface) {
    const t = await queryInterface.sequelize.transaction();
    try {
      const now = new Date();
      const amb = await ensureAmbitos(queryInterface, t);

      const org = [
        { nombre: 'Líder de Producto',        descripcion: 'Tridente: Producto',        ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Líder de Tecnología',      descripcion: 'Tridente: Tecnología',      ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Líder de Operaciones',     descripcion: 'Tridente: Operaciones',     ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },

        { nombre: 'Co-Founder y CEO',         descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Co-Founder y CGO',         descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },

        { nombre: 'Analista de Cuentas',      descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Analista de Diseño',       descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Analista Audiovisual',     descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Analista de Marketing',    descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Responsable de Comunicación', descripcion: null, ambito_id: amb.organico,
          is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Analista de Performance',  descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },

        { nombre: 'Desarrollador Fullstack',  descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Desarrollador Frontend',   descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Desarrollador Backend',    descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'QA / Testing',             descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'DevOps / SRE',             descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },

        { nombre: 'RRHH',                     descripcion: 'Capital Humano',             ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Onboarding',               descripcion: 'Ingreso y activación',       ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now }
      ];

      const cli = [
        { nombre: 'Sponsor (Cliente)',            descripcion: null, ambito_id: amb.cliente, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Product Owner (Cliente)',      descripcion: null, ambito_id: amb.cliente, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Referente Técnico (Cliente)',  descripcion: null, ambito_id: amb.cliente, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Usuario Referente (Cliente)',  descripcion: null, ambito_id: amb.cliente, is_activo: true, created_at: now, updated_at: now }
      ];

      await ensureByNombre(queryInterface, 'Cargo', [...org, ...cli], t);
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async down (queryInterface) {
    const nombres = [
      'Líder de Producto','Líder de Tecnología','Líder de Operaciones',
      'Co-Founder y CEO','Co-Founder y CGO',
      'Analista de Cuentas','Analista de Diseño','Analista Audiovisual',
      'Analista de Marketing','Analista de Performance',
      'Desarrollador Fullstack','Desarrollador Frontend','Desarrollador Backend',
      'QA / Testing','DevOps / SRE','RRHH','Onboarding',
      'Sponsor (Cliente)','Product Owner (Cliente)','Referente Técnico (Cliente)','Usuario Referente (Cliente)'
    ];
    await queryInterface.bulkDelete('Cargo', { nombre: nombres }, {});
  }
};