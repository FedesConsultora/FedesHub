// 20250820143041-0006-ausencias-default-quotas copy.cjs
'use strict';

function yearRange(d = new Date()) {
  const y = d.getUTCFullYear();
  const desde = new Date(Date.UTC(y, 0, 1));   // 1 Ene
  const hasta = new Date(Date.UTC(y, 11, 31)); // 31 Dic
  return { desde, hasta };
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const { desde, hasta } = yearRange(now);

    // === 1) Tipos de ausencia (con su unidad) ===
    const [tipoRows] = await queryInterface.sequelize.query(`
      SELECT id, codigo, unidad_id FROM "AusenciaTipo"
      WHERE codigo IN ('vacaciones','tristeza','examen')
    `);
    const tipos = Object.fromEntries(tipoRows.map(t => [t.codigo, t]));
    if (!(tipos.vacaciones && tipos.tristeza && tipos.examen)) return;

    // === 2) Usuarios/Feders de destino (ralbanesi, epinotti) ===
    const [users] = await queryInterface.sequelize.query(`
      SELECT id, email FROM "User"
      WHERE email IN ('ralbanesi@fedesconsultora.com','epinotti@fedesconsultora.com','sistemas@fedesconsultora.com')
    `);
    const uid = Object.fromEntries(users.map(u => [u.email, u.id]));

    const [feders] = await queryInterface.sequelize.query(`
      SELECT id, user_id FROM "Feder"
      WHERE user_id IN (${uid['ralbanesi@fedesconsultora.com'] || -1}, ${uid['epinotti@fedesconsultora.com'] || -1})
    `);
    const federByUserId = Object.fromEntries(feders.map(f => [f.user_id, f.id]));

    // Asignador por defecto (RRHH: ralbanesi), fallback sistemas
    const asignadoPorUserId = uid['ralbanesi@fedesconsultora.com'] || uid['sistemas@fedesconsultora.com'];

    const cuotas = [];

    // Para Romina (RRHH)
    if (federByUserId[uid['ralbanesi@fedesconsultora.com']]) {
      const fid = federByUserId[uid['ralbanesi@fedesconsultora.com']];
      cuotas.push(
        {
          feder_id: fid, tipo_id: tipos.vacaciones.id, unidad_id: tipos.vacaciones.unidad_id, cantidad_total: 15,
          vigencia_desde: desde, vigencia_hasta: hasta, comentario: 'Cuota anual inicial', asignado_por_user_id: asignadoPorUserId,
          is_activo: true, created_at: now, updated_at: now
        },
        {
          feder_id: fid, tipo_id: tipos.tristeza.id, unidad_id: tipos.tristeza.unidad_id, cantidad_total: 5,
          vigencia_desde: desde, vigencia_hasta: hasta, comentario: 'Beneficio interno', asignado_por_user_id: asignadoPorUserId,
          is_activo: true, created_at: now, updated_at: now
        },
        {
          feder_id: fid, tipo_id: tipos.examen.id, unidad_id: tipos.examen.unidad_id, cantidad_total: 32,
          vigencia_desde: desde, vigencia_hasta: hasta, comentario: 'Horas para examen', asignado_por_user_id: asignadoPorUserId,
          is_activo: true, created_at: now, updated_at: now
        }
      );
    }

    // Para Enzo
    if (federByUserId[uid['epinotti@fedesconsultora.com']]) {
      const fid = federByUserId[uid['epinotti@fedesconsultora.com']];
      cuotas.push(
        {
          feder_id: fid, tipo_id: tipos.vacaciones.id, unidad_id: tipos.vacaciones.unidad_id, cantidad_total: 15,
          vigencia_desde: desde, vigencia_hasta: hasta, comentario: 'Cuota anual inicial', asignado_por_user_id: asignadoPorUserId,
          is_activo: true, created_at: now, updated_at: now
        },
        {
          feder_id: fid, tipo_id: tipos.tristeza.id, unidad_id: tipos.tristeza.unidad_id, cantidad_total: 5,
          vigencia_desde: desde, vigencia_hasta: hasta, comentario: 'Beneficio interno', asignado_por_user_id: asignadoPorUserId,
          is_activo: true, created_at: now, updated_at: now
        },
        {
          feder_id: fid, tipo_id: tipos.examen.id, unidad_id: tipos.examen.unidad_id, cantidad_total: 32,
          vigencia_desde: desde, vigencia_hasta: hasta, comentario: 'Horas para examen', asignado_por_user_id: asignadoPorUserId,
          is_activo: true, created_at: now, updated_at: now
        }
      );
    }

    if (cuotas.length) {
      await queryInterface.bulkInsert('AusenciaCuota', cuotas, {});
    }
  },

  async down(queryInterface, Sequelize) {
    // borra solo las cuotas asignadas por estos usuarios/periodo (simple)
    await queryInterface.sequelize.query(`
      DELETE FROM "AusenciaCuota"
      WHERE comentario IN ('Cuota anual inicial','Beneficio interno','Horas para examen')
    `);
  }
};