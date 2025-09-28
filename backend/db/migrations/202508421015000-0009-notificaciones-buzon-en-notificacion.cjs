// 202508421015000-0009-notificaciones-buzon-en-notificacion.cjs
'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const { INTEGER } = Sequelize;

    // 1) Columna (NULL para backfill)
    await queryInterface.addColumn('Notificacion', 'buzon_id', {
      type: INTEGER,
      allowNull: true
    });

    // 2) Backfill desde NotificacionTipo.buzon_id
    await queryInterface.sequelize.query(`
      UPDATE "Notificacion" n
      SET buzon_id = nt.buzon_id
      FROM "NotificacionTipo" nt
      WHERE nt.id = n.tipo_id AND n.buzon_id IS NULL
    `);

    // 3) NOT NULL + FK + índice
    await queryInterface.changeColumn('Notificacion', 'buzon_id', { type: INTEGER, allowNull: false });

    await queryInterface.addConstraint('Notificacion', {
      fields: ['buzon_id'],
      type: 'foreign key',
      name: 'fk_notificacion_buzon',
      references: { table: 'BuzonTipo', field: 'id' },
      onUpdate: 'cascade',
      onDelete: 'restrict'
    });

    await queryInterface.addIndex('Notificacion', ['buzon_id']);
  },

  async down (queryInterface) {
    await queryInterface.removeIndex('Notificacion', ['buzon_id']).catch(()=>{});
    await queryInterface.removeConstraint('Notificacion', 'fk_notificacion_buzon').catch(()=>{});
    await queryInterface.removeColumn('Notificacion', 'buzon_id').catch(()=>{});
  }
};
