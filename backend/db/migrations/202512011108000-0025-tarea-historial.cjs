// Migration: TareaHistorial - Sistema de auditoría para cambios en tareas
// Registra todos los cambios importantes: estado, deadline, responsables, colaboradores, etc.

exports.up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('TareaHistorial', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    tarea_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'Tarea', key: 'id' },
      onDelete: 'CASCADE',
      comment: 'ID de la tarea modificada'
    },
    feder_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'Feder', key: 'id' },
      onDelete: 'RESTRICT',
      comment: 'Quién hizo el cambio'
    },
    tipo_cambio: {
      type: Sequelize.STRING(50),
      allowNull: false,
      comment: 'Tipo: estado, deadline, responsable, colaborador, aprobacion, etc.'
    },
    accion: {
      type: Sequelize.STRING(20),
      allowNull: false,
      comment: 'Acción: created, updated, deleted, added, removed'
    },
    valor_anterior: {
      type: Sequelize.JSONB,
      comment: 'Valor antes del cambio (estructura flexible)'
    },
    valor_nuevo: {
      type: Sequelize.JSONB,
      comment: 'Valor después del cambio'
    },
    campo: {
      type: Sequelize.STRING(100),
      comment: 'Campo específico modificado (opcional)'
    },
    descripcion: {
      type: Sequelize.TEXT,
      comment: 'Descripción legible para humanos del cambio'
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    }
  });

  // Índices para performance
  await queryInterface.addIndex('TareaHistorial', ['tarea_id'], {
    name: 'idx_tarea_historial_tarea'
  });

  await queryInterface.addIndex('TareaHistorial', ['created_at'], {
    name: 'idx_tarea_historial_fecha'
  });

  await queryInterface.addIndex('TareaHistorial', ['tipo_cambio'], {
    name: 'idx_tarea_historial_tipo'
  });

  await queryInterface.addIndex('TareaHistorial', ['feder_id'], {
    name: 'idx_tarea_historial_feder'
  });
};

exports.down = async (queryInterface) => {
  await queryInterface.dropTable('TareaHistorial');
};
