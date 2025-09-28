// backend/db/migrations/0015-add-cliente-hito.cjs
/** Agrega tabla ClienteHito y FK desde Tarea.hito_id */
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = Sequelize.fn('now');
    const idPK = { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true };
    const tsCols = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    };

    // Tabla ClienteHito
    await queryInterface.createTable('ClienteHito', {
      id: idPK,
      cliente_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Cliente', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE', // si se borra el cliente, se borran sus hitos
      },
      nombre: { type: Sequelize.STRING(160), allowNull: false },
      descripcion: Sequelize.TEXT,
      fecha_objetivo: Sequelize.DATEONLY,
      ...tsCols,
    });

    await queryInterface.addIndex('ClienteHito', ['cliente_id'], {
      name: 'IX_ClienteHito_cliente_id',
    });

    // Solo agregar FK en Tarea (la columna ya existe desde 0008)
    await queryInterface.addConstraint('Tarea', {
      fields: ['hito_id'],
      type: 'foreign key',
      name: 'FK_Tarea_ClienteHito',
      references: { table: 'ClienteHito', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    // Quitar FK de Tarea
    await queryInterface.removeConstraint('Tarea', 'FK_Tarea_ClienteHito').catch(() => {});
    
    // Quitar tabla ClienteHito
    await queryInterface.removeIndex('ClienteHito', 'IX_ClienteHito_cliente_id').catch(() => {});
    await queryInterface.dropTable('ClienteHito').catch(() => {});
  },
};
