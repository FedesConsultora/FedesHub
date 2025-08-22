// backend/db/migrations/202508220955-0810-tareas-campos-extra.cjs
'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    // Campos faltantes según tu modelo y seeder
    await queryInterface.addColumn('Tarea', 'hito_id', {
      type: Sequelize.INTEGER,
      allowNull: true
      // Si luego creás tabla Hito, acá podés agregar la FK
      // references: { model: 'Hito', key: 'id' }, onUpdate:'CASCADE', onDelete:'SET NULL'
    });

    await queryInterface.addColumn('Tarea', 'fecha_inicio', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Tarea', 'progreso_pct', {
      type: Sequelize.DECIMAL(5,2),
      allowNull: false,
      defaultValue: 0.00
    });

    await queryInterface.addColumn('Tarea', 'orden_kanban', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    // Índice que tu modelo ya declara
    await queryInterface.addIndex('Tarea', ['hito_id']);
  },

  async down (queryInterface) {
    await queryInterface.removeIndex('Tarea', ['hito_id']).catch(()=>{});
    await queryInterface.removeColumn('Tarea', 'orden_kanban').catch(()=>{});
    await queryInterface.removeColumn('Tarea', 'progreso_pct').catch(()=>{});
    await queryInterface.removeColumn('Tarea', 'fecha_inicio').catch(()=>{});
    await queryInterface.removeColumn('Tarea', 'hito_id').catch(()=>{});
  }
};
