// 202509192040585-0024-notifenvio-unique-to-index.cjs.cjs
'use strict';
module.exports = {
  async up(q) {
    // Borrar el UNIQUE viejo (constraint y/o índice si alguien lo recreó con otro nombre)
    await q.removeConstraint('NotificacionEnvio', 'UQ_NotifEnvio_destino_canal').catch(()=>{});
    await q.removeIndex('NotificacionEnvio', 'uniq_notifenvio_destino_canal').catch(()=>{});
    await q.removeIndex('NotificacionEnvio', ['destino_id','canal_id']).catch(()=>{});

    // Índice NO único nuevo
    await q.addIndex('NotificacionEnvio', ['destino_id','canal_id','proveedor_id'], {
      name: 'idx_notifenvio_destino_canal_proveedor', unique: false
    }).catch(()=>{});

    // Unique en tracking_token
    await q.addIndex('NotificacionEnvio', ['tracking_token'], {
      name: 'uniq_notifenvio_tracking_token', unique: true
    }).catch(()=>{});
  },
  async down(q) {
    await q.removeIndex('NotificacionEnvio', 'idx_notifenvio_destino_canal_proveedor').catch(()=>{});
    await q.removeIndex('NotificacionEnvio', 'uniq_notifenvio_tracking_token').catch(()=>{});
    await q.addConstraint('NotificacionEnvio', {
      fields: ['destino_id','canal_id'],
      type: 'unique',
      name: 'UQ_NotifEnvio_destino_canal'
    }).catch(()=>{});
  }
};
