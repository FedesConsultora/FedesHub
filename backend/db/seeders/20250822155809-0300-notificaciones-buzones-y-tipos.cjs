'use strict';

module.exports = {
  async up (queryInterface) {
    const now = new Date();

    // 1) Buzones (idempotente)
    await queryInterface.sequelize.query(`
      INSERT INTO "BuzonTipo"(codigo,nombre) VALUES
        ('tareas','Tareas'),
        ('chat','Chat'),
        ('calendario','Calendario/Reuniones')
      ON CONFLICT (codigo) DO NOTHING;
    `);

    const [[bzTareas]]   = await queryInterface.sequelize.query(`SELECT id FROM "BuzonTipo" WHERE codigo='tareas' LIMIT 1`);
    const [[bzChat]]     = await queryInterface.sequelize.query(`SELECT id FROM "BuzonTipo" WHERE codigo='chat' LIMIT 1`);
    const [[bzCalendar]] = await queryInterface.sequelize.query(`SELECT id FROM "BuzonTipo" WHERE codigo='calendario' LIMIT 1`);

    if (!bzTareas?.id || !bzChat?.id || !bzCalendar?.id) {
      throw new Error('No se pudieron obtener los IDs de BuzonTipo.');
    }

    // 2) Canales (asegurar push)
    await queryInterface.sequelize.query(`
      INSERT INTO "CanalTipo"(codigo,nombre) VALUES
        ('in_app','In-App'),
        ('email','Email'),
        ('push','Push')
      ON CONFLICT (codigo) DO NOTHING;
    `);

    // 3) Tipos base con su buzon/canales
    const tipos = [
      // TAREAS
      ['tarea_asignada',      'Tarea asignada',           bzTareas.id,   ['in_app','email']],
      ['tarea_comentario',    'Comentario en tarea',      bzTareas.id,   ['in_app']],
      ['tarea_vencimiento',   'Tarea próxima a vencer',   bzTareas.id,   ['in_app','email']],
      // AUSENCIAS → bandeja Tareas
      ['ausencia_aprobada',   'Ausencia aprobada',        bzTareas.id,   ['in_app','email']],
      ['ausencia_denegada',   'Ausencia denegada',        bzTareas.id,   ['in_app','email']],
      // SISTEMA → bandeja Tareas (genérico)
      ['sistema',             'Sistema',                  bzTareas.id,   ['in_app','email']],

      // CHAT
      ['chat_mencion',        'Mención en chat',          bzChat.id,     ['in_app','push']],
      ['chat_mensaje',        'Nuevo mensaje en chat',    bzChat.id,     ['in_app','push']],

      // CALENDARIO / REUNIONES
      ['evento_invitacion',   'Invitación a evento',      bzCalendar.id, ['in_app','email']],
      ['recordatorio',        'Recordatorio de evento',   bzCalendar.id, ['in_app','push','email']]
    ];

    // 4) Upsert idempotente (garantiza buzon_id y canales)
    for (const [codigo, nombre, buzon_id, canales] of tipos) {
      await queryInterface.sequelize.query(`
        INSERT INTO "NotificacionTipo"(codigo, nombre, buzon_id, canales_default_json, created_at, updated_at)
        VALUES (:codigo, :nombre, :buzon_id, :canales::jsonb, :now, :now)
        ON CONFLICT (codigo) DO UPDATE
        SET nombre = EXCLUDED.nombre,
            buzon_id = EXCLUDED.buzon_id,
            canales_default_json = EXCLUDED.canales_default_json,
            updated_at = EXCLUDED.updated_at;
      `, {
        replacements: {
          codigo,
          nombre,
          buzon_id,
          canales: JSON.stringify(canales),
          now
        }
      });
    }

    // 5) Backfill defensivo por si existían filas antiguas sin buzon_id
    await queryInterface.sequelize.query(`
      UPDATE "NotificacionTipo"
      SET buzon_id = (SELECT id FROM "BuzonTipo" WHERE codigo='tareas')
      WHERE buzon_id IS NULL AND (codigo LIKE 'tarea_%' OR codigo LIKE 'ausencia_%' OR codigo='sistema');
    `);
    await queryInterface.sequelize.query(`
      UPDATE "NotificacionTipo"
      SET buzon_id = (SELECT id FROM "BuzonTipo" WHERE codigo='chat')
      WHERE buzon_id IS NULL AND codigo LIKE 'chat_%';
    `);
    await queryInterface.sequelize.query(`
      UPDATE "NotificacionTipo"
      SET buzon_id = (SELECT id FROM "BuzonTipo" WHERE codigo='calendario')
      WHERE buzon_id IS NULL AND (codigo LIKE 'evento_%' OR codigo='recordatorio');
    `);
  },

  async down (queryInterface) {
    await queryInterface.bulkDelete('NotificacionTipo', {
      codigo: [
        'tarea_asignada','tarea_comentario','tarea_vencimiento',
        'ausencia_aprobada','ausencia_denegada',
        'sistema',
        'chat_mencion','chat_mensaje',
        'evento_invitacion','recordatorio'
      ]
    }, {});
    // No borramos BuzonTipo/CanalTipo aquí para no romper otros datos.
  }
};
