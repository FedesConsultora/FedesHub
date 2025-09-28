// 202508551246240-0010-calendario-fixes.cjs
/** Parches calendario: vinculación webhooks, unicidades y recurrencias (safe) */
'use strict';
module.exports = {
  async up(q, S) {
    // 1) Webhook ↔ calendario (nullable primero)
    await q.addColumn('GoogleWebhookCanal', 'google_cal_id', {
      type: S.INTEGER,
      allowNull: true, // <— CAMBIO
      references: { model: 'GoogleCalendario', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    }).catch(()=>{});
    await q.addIndex('GoogleWebhookCanal', ['google_cal_id', 'is_activo'], { name: 'IX_Webhook_cal_activo' }).catch(()=>{});

    // (Opcional) Backfill si podés inferir el calendario de cada canal:
    // await q.sequelize.query(`UPDATE "GoogleWebhookCanal" ...`);
    // Si garantizás que no quedan NULL:
    // await q.changeColumn('GoogleWebhookCanal','google_cal_id',{ type:S.INTEGER, allowNull:false }).catch(()=>{});

    // 2) Unicidades (idempotentes)
    await q.addConstraint('GoogleCalendario', {
      fields: ['cuenta_id', 'google_calendar_id'],
      type: 'unique',
      name: 'UQ_GoogleCalendario_cuenta_calendar'
    }).catch(()=>{});
    await q.addConstraint('EventoSync', {
      fields: ['google_cal_id', 'google_event_id'],
      type: 'unique',
      name: 'UQ_EventoSync_googlecal_googleevent'
    }).catch(()=>{});

    // 3) Recurrencias/excepciones
    await q.addColumn('EventoSync', 'ical_uid', { type: S.STRING(256) }).catch(()=>{});
    await q.addColumn('EventoSync', 'recurring_event_id', { type: S.STRING(256) }).catch(()=>{});
    await q.addColumn('EventoSync', 'original_start_time', { type: S.DATE }).catch(()=>{});

    // 4) Índice de rango de tiempo para overlays (idempotente)
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
    await q.sequelize.query(`DROP INDEX IF EXISTS "IX_Evento_timerange";`);
    await q.removeColumn('EventoSync', 'original_start_time').catch(()=>{});
    await q.removeColumn('EventoSync', 'recurring_event_id').catch(()=>{});
    await q.removeColumn('EventoSync', 'ical_uid').catch(()=>{});

    await q.removeConstraint('EventoSync', 'UQ_EventoSync_googlecal_googleevent').catch(()=>{});
    await q.removeConstraint('GoogleCalendario', 'UQ_GoogleCalendario_cuenta_calendar').catch(()=>{});

    await q.removeIndex('GoogleWebhookCanal', 'IX_Webhook_cal_activo').catch(()=>{});
    await q.removeColumn('GoogleWebhookCanal', 'google_cal_id').catch(()=>{});
  }
};
