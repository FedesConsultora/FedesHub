/** Parches calendario: vinculación webhooks, unicidades y recurrencias */
module.exports = {
  async up(q, S) {
    // 1) Webhook ↔ calendario
    await q.addColumn('GoogleWebhookCanal', 'google_cal_id', {
      type: S.INTEGER,
      allowNull: false,
      references: { model: 'GoogleCalendario', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
    await q.addIndex('GoogleWebhookCanal', ['google_cal_id', 'is_activo'], { name: 'IX_Webhook_cal_activo' });

    // 2) Unicidades
    await q.addConstraint('GoogleCalendario', {
      fields: ['cuenta_id', 'google_calendar_id'],
      type: 'unique',
      name: 'UQ_GoogleCalendario_cuenta_calendar'
    });
    await q.addConstraint('EventoSync', {
      fields: ['google_cal_id', 'google_event_id'],
      type: 'unique',
      name: 'UQ_EventoSync_googlecal_googleevent'
    });

    // 3) Recurrencias/excepciones
    await q.addColumn('EventoSync', 'ical_uid', { type: S.STRING(256) });
    await q.addColumn('EventoSync', 'recurring_event_id', { type: S.STRING(256) });
    await q.addColumn('EventoSync', 'original_start_time', { type: S.DATE });

    // 4) Índice de rango de tiempo para overlays
    await q.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relname = 'IX_Evento_timerange' AND n.nspname = 'public'
        ) THEN
          CREATE INDEX "IX_Evento_timerange" ON "Evento" USING GIST (tstzrange(starts_at, ends_at));
        END IF;
      END$$;
    `);
  },

  async down(q) {
    await q.removeIndex('GoogleWebhookCanal', 'IX_Webhook_cal_activo');
    await q.removeColumn('GoogleWebhookCanal', 'google_cal_id');

    await q.removeConstraint('GoogleCalendario', 'UQ_GoogleCalendario_cuenta_calendar');
    await q.removeConstraint('EventoSync', 'UQ_EventoSync_googlecal_googleevent');

    await q.removeColumn('EventoSync', 'ical_uid');
    await q.removeColumn('EventoSync', 'recurring_event_id');
    await q.removeColumn('EventoSync', 'original_start_time');

    await q.sequelize.query(`DROP INDEX IF EXISTS "IX_Evento_timerange";`);
  }
};
