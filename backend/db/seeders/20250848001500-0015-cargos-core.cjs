'use strict';

/**
 * 0015 - Cargos core (idempotente)
 * Actualizado: usa "Desarrollador Fullstack" (en vez de "Desarrollador").
 */

async function ensureAmbitos(queryInterface, t) {
  const departmentRows = [
    { codigo: 'organico', nombre: 'Orgánico', descripcion: 'General' },
    { codigo: 'fedes-cloud', nombre: 'Fedes Cloud', descripcion: 'IT / Tecnología' },
    { codigo: 'ventas', nombre: 'Ventas', descripcion: 'Área Comercial' },
    { codigo: 'operaciones', nombre: 'Operaciones', descripcion: 'Coordinación Operativa' },
    { codigo: 'creativo', nombre: 'Creativo', descripcion: 'Células y Producción' },
    { codigo: 'cliente', nombre: 'Cliente', descripcion: 'Ámbito Externo' }
  ].map(r => ({ ...r, created_at: new Date(), updated_at: new Date() }));

  for (const row of departmentRows) {
    await queryInterface.sequelize.query(`
      INSERT INTO "CargoAmbito"(codigo, nombre, descripcion, created_at, updated_at)
      VALUES (:codigo, :nombre, :descripcion, :created_at, :updated_at)
      ON CONFLICT (codigo) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        descripcion = EXCLUDED.descripcion,
        updated_at = EXCLUDED.updated_at;
    `, { transaction: t, replacements: row });
  }

  const [rows] = await queryInterface.sequelize.query(
    `SELECT id, codigo FROM "CargoAmbito"`,
    { transaction: t }
  );
  return Object.fromEntries(rows.map(r => [r.codigo, r.id]));
}

async function ensureByNombre(queryInterface, table, rows, t) {
  if (!rows.length) return;
  for (const row of rows) {
    await queryInterface.sequelize.query(`
      INSERT INTO "${table}"(nombre, descripcion, ambito_id, is_activo, created_at, updated_at)
      VALUES (:nombre, :descripcion, :ambito_id, :is_activo, :created_at, :updated_at)
      ON CONFLICT (nombre) DO UPDATE SET
        ambito_id = EXCLUDED.ambito_id,
        updated_at = EXCLUDED.updated_at;
    `, { transaction: t, replacements: row });
  }
}

module.exports = {
  async up(queryInterface) {
    const t = await queryInterface.sequelize.transaction();
    try {
      const now = new Date();
      const amb = await ensureAmbitos(queryInterface, t);

      const org = [
        { nombre: 'Líder de Producto', descripcion: 'Tridente: Producto', ambito_id: amb.creativo, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Líder de Tecnología', descripcion: 'Tridente: Tecnología', ambito_id: amb['fedes-cloud'], is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Líder de Operaciones', descripcion: 'Tridente: Operaciones', ambito_id: amb.operaciones, is_activo: true, created_at: now, updated_at: now },

        { nombre: 'Co-Founder y CEO', descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Co-Founder y CGO', descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'COO', descripcion: 'Chief Operating Officer', ambito_id: amb.operaciones, is_activo: true, created_at: now, updated_at: now },

        { nombre: 'Analista de Cuentas', descripcion: null, ambito_id: amb.creativo, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Analista de Diseño', descripcion: null, ambito_id: amb.creativo, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Analista Audiovisual', descripcion: null, ambito_id: amb.creativo, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Analista de Marketing', descripcion: null, ambito_id: amb.creativo, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Analista de Sistemas', descripcion: null, ambito_id: amb['fedes-cloud'], is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Responsable de Comunicación', descripcion: null, ambito_id: amb.creativo, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Responsable Editorial y de Comunicación', descripcion: null, ambito_id: amb.creativo, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Analista de Performance', descripcion: null, ambito_id: amb.creativo, is_activo: true, created_at: now, updated_at: now },

        { nombre: 'Desarrollador Fullstack', descripcion: null, ambito_id: amb['fedes-cloud'], is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Desarrollador Frontend', descripcion: null, ambito_id: amb['fedes-cloud'], is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Desarrollador Backend', descripcion: null, ambito_id: amb['fedes-cloud'], is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Desarrolladora Web', descripcion: null, ambito_id: amb['fedes-cloud'], is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Asesora Comercial', descripcion: null, ambito_id: amb.ventas, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'QA / Testing', descripcion: null, ambito_id: amb['fedes-cloud'], is_activo: true, created_at: now, updated_at: now },
        { nombre: 'DevOps / SRE', descripcion: null, ambito_id: amb['fedes-cloud'], is_activo: true, created_at: now, updated_at: now },

        { nombre: 'RRHH', descripcion: 'Capital Humano', ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Onboarding', descripcion: 'Ingreso y activación', ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now }
      ];

      const cli = [
        { nombre: 'Sponsor (Cliente)', descripcion: null, ambito_id: amb.cliente, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Product Owner (Cliente)', descripcion: null, ambito_id: amb.cliente, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Referente Técnico (Cliente)', descripcion: null, ambito_id: amb.cliente, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Usuario Referente (Cliente)', descripcion: null, ambito_id: amb.cliente, is_activo: true, created_at: now, updated_at: now }
      ];

      await ensureByNombre(queryInterface, 'Cargo', [...org, ...cli], t);
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async down(queryInterface) {
    const nombres = [
      'Líder de Producto', 'Líder de Tecnología', 'Líder de Operaciones',
      'Co-Founder y CEO', 'Co-Founder y CGO',
      'Analista de Cuentas', 'Analista de Diseño', 'Analista Audiovisual',
      'Analista de Marketing', 'Analista de Performance',
      'Desarrollador Fullstack', 'Desarrollador Frontend', 'Desarrollador Backend',
      'QA / Testing', 'DevOps / SRE', 'RRHH', 'Onboarding',
      'Sponsor (Cliente)', 'Product Owner (Cliente)', 'Referente Técnico (Cliente)', 'Usuario Referente (Cliente)'
    ];
    await queryInterface.bulkDelete('Cargo', { nombre: nombres }, {});
  }
};
