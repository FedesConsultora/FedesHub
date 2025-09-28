// 202508220519010-0006-tareas-core.cjs
// NOTA: El core de Tareas ya existe en 0001-initial-schema.cjs.
// Esta migración queda como NO-OP idempotente: asegura solo índices útiles si faltan.

'use strict';

module.exports = {
  async up (q, Sequelize) {
    // helpers
    const safeIndex = async (table, name, cols) => {
      try {
        await q.sequelize.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname=${q.sequelize.escape(name)}
            ) THEN
              CREATE INDEX "${name}" ON "${table}" (${cols});
            END IF;
          END$$;
        `);
      } catch {}
    };

    // Verificar que exista Tarea (creada por 0001)
    try { await q.describeTable('Tarea'); }
    catch {
      throw new Error('[0800-tareas-core] Falta la tabla Tarea (debe correr 0001 primero).');
    }

    // Índices “por si faltan”
    await safeIndex('Tarea', 'ix_Tarea_cliente_id',        '"cliente_id"');
    await safeIndex('Tarea', 'ix_Tarea_estado_id',         '"estado_id"');
    await safeIndex('Tarea', 'ix_Tarea_vencimiento',       '"vencimiento"');
    await safeIndex('Tarea', 'ix_Tarea_prioridad_num',     '"prioridad_num"');
    await safeIndex('Tarea', 'ix_Tarea_tarea_padre_id',    '"tarea_padre_id"');

    await safeIndex('TareaResponsable', 'ix_TareaResp_tarea_feder', '"tarea_id","feder_id"');
    await safeIndex('TareaColaborador', 'ix_TareaColab_tarea_feder', '"tarea_id","feder_id"');
    await safeIndex('TareaComentario', 'ix_TareaComent_tarea_created', '"tarea_id","created_at"');
    await safeIndex('TareaAdjunto', 'ix_TareaAdjunto_tarea', '"tarea_id"');
  },

  async down () {
    // No hacemos nada: no-op
  }
};
