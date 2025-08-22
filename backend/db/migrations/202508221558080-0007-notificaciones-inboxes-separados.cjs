'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, JSONB, BOOLEAN, DATE } = Sequelize;

    // 0) Tablas auxiliares necesarias (idempotentes)
    await queryInterface.createTable('BuzonTipo', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      codigo: { type: STRING(30), allowNull: false, unique: true },
      nombre: { type: STRING(60), allowNull: false },
      descripcion: { type: TEXT }
    }).catch(()=>{});

    await queryInterface.createTable('ChatCanal', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      tipo: { type: STRING(20), allowNull: false }, // p.ej.: 'dm' | 'team' | 'project'
      nombre: { type: STRING(120) },
      slug: { type: STRING(120), unique: true },
      is_archivado: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_by_user_id: { type: INTEGER },
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('now') }
    }).catch(()=>{});
    await queryInterface.addIndex('ChatCanal', ['tipo']).catch(()=>{});

    // 1) NotificacionTipo: agregar columnas (NULL primero para backfill)
    await queryInterface.addColumn('NotificacionTipo', 'buzon_id', { type: INTEGER, allowNull: true }).catch(()=>{});
    await queryInterface.addColumn('NotificacionTipo', 'canales_default_json', { type: JSONB, allowNull: true }).catch(()=>{});

    // 1.a) Semilla mínima de buzones (idempotente)
    await queryInterface.sequelize.query(`
      INSERT INTO "BuzonTipo"(codigo,nombre) VALUES
        ('tareas','Tareas'),
        ('chat','Chat'),
        ('calendario','Calendario/Reuniones')
      ON CONFLICT (codigo) DO NOTHING;
    `);

    // 1.b) Backfill de buzon_id según codigo (sin :replacements)
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

    // 1.c) Defaults de canales si faltan
    await queryInterface.sequelize.query(`
      UPDATE "NotificacionTipo" 
      SET canales_default_json = '["in_app","email"]'::jsonb
      WHERE canales_default_json IS NULL 
        AND (codigo LIKE 'tarea_%' OR codigo LIKE 'ausencia_%' OR codigo LIKE 'evento_%' OR codigo='sistema');
    `);
    await queryInterface.sequelize.query(`
      UPDATE "NotificacionTipo" 
      SET canales_default_json = '["in_app"]'::jsonb
      WHERE canales_default_json IS NULL AND codigo LIKE 'chat_%';
    `);

    // 1.d) Hacer NOT NULL + FK
    await queryInterface.changeColumn('NotificacionTipo', 'buzon_id', { type: INTEGER, allowNull: false }).catch(()=>{});
    await queryInterface.addConstraint('NotificacionTipo', {
      fields: ['buzon_id'],
      type: 'foreign key',
      name: 'fk_notiftipo_buzon',
      references: { table: 'BuzonTipo', field: 'id' },
      onUpdate: 'cascade',
      onDelete: 'restrict'
    }).catch(()=>{});

    // 1.e) Asegurar canal 'push'
    await queryInterface.sequelize.query(`
      INSERT INTO "CanalTipo"(codigo,nombre) 
      SELECT 'push','Push' 
      WHERE NOT EXISTS (SELECT 1 FROM "CanalTipo" WHERE codigo='push');
    `);

    // 2) Notificacion: nuevos campos + índices
    await queryInterface.addColumn('Notificacion', 'hilo_key', { type: STRING(120) }).catch(()=>{});
    await queryInterface.addColumn('Notificacion', 'evento_id', { type: INTEGER, allowNull: true }).catch(()=>{});
    await queryInterface.addColumn('Notificacion', 'chat_canal_id', { type: INTEGER, allowNull: true }).catch(()=>{});
    await queryInterface.addIndex('Notificacion', ['evento_id']).catch(()=>{});
    await queryInterface.addIndex('Notificacion', ['chat_canal_id']).catch(()=>{});
    await queryInterface.addIndex('Notificacion', ['hilo_key']).catch(()=>{});

    // 2.a) FKs (Evento y ChatCanal)
    await queryInterface.addConstraint('Notificacion', {
      fields: ['chat_canal_id'],
      type: 'foreign key',
      name: 'fk_notif_chatcanal',
      references: { table: 'ChatCanal', field: 'id' },
      onUpdate: 'cascade',
      onDelete: 'set null'
    }).catch(()=>{});
    await queryInterface.addConstraint('Notificacion', {
      fields: ['evento_id'],
      type: 'foreign key',
      name: 'fk_notif_evento',
      references: { table: 'Evento', field: 'id' },
      onUpdate: 'cascade',
      onDelete: 'set null'
    }).catch(()=>{});

    // 3) NotificacionDestino: nuevos campos + índices
    await queryInterface.addColumn('NotificacionDestino', 'in_app_seen_at', { type: DATE }).catch(()=>{});
    await queryInterface.addColumn('NotificacionDestino', 'read_at', { type: DATE }).catch(()=>{});
    await queryInterface.addColumn('NotificacionDestino', 'dismissed_at', { type: DATE }).catch(()=>{});
    await queryInterface.addColumn('NotificacionDestino', 'archived_at', { type: DATE }).catch(()=>{});
    await queryInterface.addColumn('NotificacionDestino', 'pin_orden', { type: INTEGER }).catch(()=>{});
    await queryInterface.addIndex('NotificacionDestino', ['user_id','archived_at']).catch(()=>{});
    await queryInterface.addIndex('NotificacionDestino', ['user_id','read_at']).catch(()=>{});
    await queryInterface.addIndex('NotificacionDestino', ['user_id','pin_orden']).catch(()=>{});
  },

  async down (queryInterface) {
    // NotificacionDestino
    await queryInterface.removeIndex('NotificacionDestino', ['user_id','pin_orden']).catch(()=>{});
    await queryInterface.removeIndex('NotificacionDestino', ['user_id','read_at']).catch(()=>{});
    await queryInterface.removeIndex('NotificacionDestino', ['user_id','archived_at']).catch(()=>{});
    for (const col of ['pin_orden','archived_at','dismissed_at','read_at','in_app_seen_at']) {
      await queryInterface.removeColumn('NotificacionDestino', col).catch(()=>{});
    }

    // Notificacion
    await queryInterface.removeIndex('Notificacion', ['hilo_key']).catch(()=>{});
    await queryInterface.removeIndex('Notificacion', ['chat_canal_id']).catch(()=>{});
    await queryInterface.removeIndex('Notificacion', ['evento_id']).catch(()=>{});
    await queryInterface.removeConstraint('Notificacion', 'fk_notif_chatcanal').catch(()=>{});
    await queryInterface.removeConstraint('Notificacion', 'fk_notif_evento').catch(()=>{});
    for (const col of ['chat_canal_id','evento_id','hilo_key']) {
      await queryInterface.removeColumn('Notificacion', col).catch(()=>{});
    }

    // NotificacionTipo
    await queryInterface.removeConstraint('NotificacionTipo', 'fk_notiftipo_buzon').catch(()=>{});
    await queryInterface.removeColumn('NotificacionTipo', 'canales_default_json').catch(()=>{});
    await queryInterface.removeColumn('NotificacionTipo', 'buzon_id').catch(()=>{});

    // Auxiliares
    await queryInterface.dropTable('ChatCanal').catch(()=>{});
    await queryInterface.dropTable('BuzonTipo').catch(()=>{});
  }
};
