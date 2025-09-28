// backend/db/migrations/20250828-0017-tareas-extras.cjs
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = Sequelize.fn('now');
    const idPK = { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true };

    // TareaFavorito
    await queryInterface.createTable('TareaFavorito', {
      id: idPK,
      tarea_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Tarea', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      user_id:  { type: Sequelize.INTEGER, allowNull: false, references: { model: 'User', key: 'id' },  onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now }
    });
    await queryInterface.addConstraint('TareaFavorito', {
      fields: ['tarea_id', 'user_id'],
      type: 'unique',
      name: 'UQ_TareaFavorito_tarea_user'
    });

    // TareaSeguidor
    await queryInterface.createTable('TareaSeguidor', {
      id: idPK,
      tarea_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Tarea', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      user_id:  { type: Sequelize.INTEGER, allowNull: false, references: { model: 'User', key: 'id' },  onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now }
    });
    await queryInterface.addConstraint('TareaSeguidor', {
      fields: ['tarea_id', 'user_id'],
      type: 'unique',
      name: 'UQ_TareaSeguidor_tarea_user'
    });

    // TareaChecklistItem
    await queryInterface.createTable('TareaChecklistItem', {
      id: idPK,
      tarea_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Tarea', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      titulo: { type: Sequelize.STRING(200), allowNull: false },
      is_done: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now }
    });
    await queryInterface.addIndex('TareaChecklistItem', ['tarea_id', 'orden'], { name: 'IX_TareaChecklistItem_tarea_orden' });

    // TareaRelacionTipo
    await queryInterface.createTable('TareaRelacionTipo', {
      id: idPK,
      codigo: { type: Sequelize.STRING(40), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now }
    });

    // TareaRelacion
    await queryInterface.createTable('TareaRelacion', {
      id: idPK,
      tarea_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Tarea', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      relacionada_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Tarea', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      tipo_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'TareaRelacionTipo', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now }
    });
    await queryInterface.addConstraint('TareaRelacion', {
      fields: ['tarea_id', 'relacionada_id', 'tipo_id'],
      type: 'unique',
      name: 'UQ_TareaRelacion_tripleta'
    });

    // TareaComentarioMencion
    await queryInterface.createTable('TareaComentarioMencion', {
      id: idPK,
      comentario_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'TareaComentario', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      feder_id:     { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Feder', key: 'id' },          onUpdate: 'CASCADE', onDelete: 'CASCADE' }
    });
    await queryInterface.addConstraint('TareaComentarioMencion', {
      fields: ['comentario_id', 'feder_id'],
      type: 'unique',
      name: 'UQ_TareaComentarioMencion_comentario_feder'
    });

    // Alter TareaAdjunto: comentario_id
    await queryInterface.addColumn('TareaAdjunto', 'comentario_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'TareaComentario', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.addIndex('TareaAdjunto', ['comentario_id'], { name: 'IX_TareaAdjunto_comentario_id' });
  },

  async down(q) {
    await q.removeIndex('TareaAdjunto', 'IX_TareaAdjunto_comentario_id').catch(()=>{});
    await q.removeColumn('TareaAdjunto', 'comentario_id').catch(()=>{});

    await q.dropTable('TareaComentarioMencion').catch(()=>{});
    await q.removeConstraint('TareaRelacion', 'UQ_TareaRelacion_tripleta').catch(()=>{});
    await q.dropTable('TareaRelacion').catch(()=>{});
    await q.dropTable('TareaRelacionTipo').catch(()=>{});

    // FIX: quitar índice (era addIndex), no removeConstraint
    await q.removeIndex('TareaChecklistItem', 'IX_TareaChecklistItem_tarea_orden').catch(()=>{});
    await q.dropTable('TareaChecklistItem').catch(()=>{});

    await q.removeConstraint('TareaSeguidor', 'UQ_TareaSeguidor_tarea_user').catch(()=>{});
    await q.dropTable('TareaSeguidor').catch(()=>{});

    await q.removeConstraint('TareaFavorito', 'UQ_TareaFavorito_tarea_user').catch(()=>{});
    await q.dropTable('TareaFavorito').catch(()=>{});
  }
};
