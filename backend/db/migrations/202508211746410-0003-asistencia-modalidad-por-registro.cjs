'use strict';

/**
 * Agrega modalidad_id a AsistenciaRegistro y hace backfill
 * desde el plan semanal (FederModalidadDia). Seed básico:
 * 'presencial' y 'home'.
*/

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1) Nueva columna
    await queryInterface.addColumn('AsistenciaRegistro', 'modalidad_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    // 2) FK -> ModalidadTrabajoTipo
    await queryInterface.addConstraint('AsistenciaRegistro', {
      fields: ['modalidad_id'],
      type: 'foreign key',
      name: 'fk_AsistenciaRegistro_modalidad',
      references: { table: 'ModalidadTrabajoTipo', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // 3) Índice (opcional pero útil para reportes)
    await queryInterface.addIndex('AsistenciaRegistro', ['modalidad_id'], {
      name: 'ix_AsistenciaRegistro_modalidad'
    });

    // 4) Semillas mínimas de modalidades
    await queryInterface.sequelize.query(`
      INSERT INTO "ModalidadTrabajoTipo"(codigo, nombre, created_at, updated_at)
      VALUES ('presencial','Presencial', NOW(), NOW())
      ON CONFLICT (codigo) DO NOTHING;
    `);
    await queryInterface.sequelize.query(`
      INSERT INTO "ModalidadTrabajoTipo"(codigo, nombre, created_at, updated_at)
      VALUES ('home','Home Office', NOW(), NOW())
      ON CONFLICT (codigo) DO NOTHING;
    `);

    // 5) Backfill: usar plan del día si existe, si no → 'presencial'
    await queryInterface.sequelize.query(`
      UPDATE "AsistenciaRegistro" ar
      SET modalidad_id = sub.modalidad_id
      FROM (
        SELECT ar2.id,
               (
                 SELECT fmd.modalidad_id
                 FROM "FederModalidadDia" fmd
                 WHERE fmd.feder_id = ar2.feder_id
                   AND fmd.dia_semana_id = EXTRACT(ISODOW FROM ar2.check_in_at)::int
                   AND fmd.is_activo = true
                 LIMIT 1
               ) AS modalidad_id
        FROM "AsistenciaRegistro" ar2
      ) AS sub
      WHERE ar.id = sub.id AND ar.modalidad_id IS NULL AND sub.modalidad_id IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE "AsistenciaRegistro" ar
      SET modalidad_id = (SELECT id FROM "ModalidadTrabajoTipo" WHERE codigo='presencial')
      WHERE ar.modalidad_id IS NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('AsistenciaRegistro', 'ix_AsistenciaRegistro_modalidad').catch(()=>{});
    await queryInterface.removeConstraint('AsistenciaRegistro', 'fk_AsistenciaRegistro_modalidad').catch(()=>{});
    await queryInterface.removeColumn('AsistenciaRegistro', 'modalidad_id').catch(()=>{});
    // Nota: no borramos las seeds 'presencial'/'home' por si otros datos las usan.
  }
};
