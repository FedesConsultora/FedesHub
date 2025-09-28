/** 202508211812250-0004-asistencia-constraints.cjs

*/
'use strict';
module.exports = {
  async up(queryInterface) {
    // 1) ÚNICO registro abierto por feder
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX "UQ_AsistenciaRegistro_abierto_por_feder"
      ON "AsistenciaRegistro"(feder_id)
      WHERE check_out_at IS NULL;
    `);

    // 2) Cronología consistente
    await queryInterface.sequelize.query(`
      ALTER TABLE "AsistenciaRegistro"
      ADD CONSTRAINT "ck_AsistenciaRegistro_chronology"
      CHECK (check_out_at IS NULL OR check_out_at >= check_in_at);
    `);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "AsistenciaRegistro"
      DROP CONSTRAINT IF EXISTS "ck_AsistenciaRegistro_chronology";
    `);
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "UQ_AsistenciaRegistro_abierto_por_feder";
    `);
  }
};
