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
// backend/db/migrations/20250828-0018-tarea-kanban-pos.cjs
'use strict';
module.exports = {
  async up (queryInterface, Sequelize) {
    const now = Sequelize.fn('now');
    await queryInterface.createTable('TareaKanbanPos', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tarea_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Tarea', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'User', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      stage_code: { // inbox | today | week | month | later
        type: Sequelize.STRING(20), allowNull: false
      },
      pos: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now }
    });
    await queryInterface.addConstraint('TareaKanbanPos', {
      fields: ['user_id','tarea_id'],
      type: 'unique',
      name: 'UQ_TareaKanbanPos_user_tarea'
    });
    await queryInterface.addIndex('TareaKanbanPos', ['user_id','stage_code','pos'], { name: 'IX_TareaKanbanPos_user_stage_pos' });
    // (opcional) CHECK de valores válidos:
    // await queryInterface.sequelize.query(`ALTER TABLE "TareaKanbanPos"
    //   ADD CONSTRAINT "CK_TareaKanbanPos_stage" CHECK (stage_code IN ('inbox','today','week','month','later'));`);
  },
  async down (queryInterface) {
    await queryInterface.dropTable('TareaKanbanPos');
  }
};
// backend/db/migrations/20250828...-0019-tarea-comentario-reply-to.cjs
'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    // 1) Columna nullable
    await queryInterface.addColumn('TareaComentario', 'reply_to_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    // 2) FK opcional hacia el mismo comentario (ON DELETE SET NULL)
    await queryInterface.addConstraint('TareaComentario', {
      fields: ['reply_to_id'],
      type: 'foreign key',
      name: 'FK_TareaComentario_reply_to',
      references: { table: 'TareaComentario', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // 3) Índice para acelerar búsquedas por reply_to_id
    await queryInterface.addIndex('TareaComentario', ['reply_to_id'], {
      name: 'IX_TareaComentario_reply_to'
    });
  },

  async down (queryInterface) {
    // Revertir en orden inverso
    await queryInterface.removeIndex('TareaComentario', 'IX_TareaComentario_reply_to').catch(()=>{});
    await queryInterface.removeConstraint('TareaComentario', 'FK_TareaComentario_reply_to').catch(()=>{});
    await queryInterface.removeColumn('TareaComentario', 'reply_to_id');
  }
};

'use strict';

/**. 202509121245240-0021-chat-delta-indexes.cjs
 * 0021 - Chat Delta Indexes & Constraints
 * - Índices para scroll infinito y threads:
 *     ChatMensaje (canal_id, id), (parent_id, id)
 * - Unicidad para evitar duplicados de previews:
 *     ChatLinkPreview (mensaje_id, url)
 * - Índice por expresión (búsqueda por nombre en canales):
 *     IX_ChatCanal_nombre_lower (lower(nombre))
 */
module.exports = {
  async up(q, S) {
    // 1) ChatMensaje: índices para el patrón real de paginación y threads
    await q.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='IX_ChatMensaje_canal_id'
        ) THEN
          CREATE INDEX "IX_ChatMensaje_canal_id" ON "ChatMensaje"(canal_id, id);
        END IF;
      END$$;
    `);

    await q.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='IX_ChatMensaje_parent_id'
        ) THEN
          CREATE INDEX "IX_ChatMensaje_parent_id" ON "ChatMensaje"(parent_id, id);
        END IF;
      END$$;
    `);

    // 2) ChatLinkPreview: prevenir duplicados de la misma URL por mensaje
    await q.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'UQ_ChatLinkPreview_msg_url'
        ) THEN
          ALTER TABLE "ChatLinkPreview"
          ADD CONSTRAINT "UQ_ChatLinkPreview_msg_url"
          UNIQUE (mensaje_id, url);
        END IF;
      END$$;
    `);

    // 3) (Opcional recomendado) Búsqueda ágil por nombre de canal (lower(nombre))
    //    Esto ayuda si usás q ILIKE '%texto%'. Si luego querés fuzzy real, ver pg_trgm.
    await q.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='IX_ChatCanal_nombre_lower'
        ) THEN
          CREATE INDEX "IX_ChatCanal_nombre_lower"
          ON "ChatCanal"(lower(nombre));
        END IF;
      END$$;
    `);
  },

  async down(q) {
    const dropIndex = async (name) => {
      try { await q.sequelize.query(`DROP INDEX IF EXISTS "${name}"`); } catch {}
    };
    const dropConstraint = async (table, name) => {
      try { await q.sequelize.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${name}"`); } catch {}
    };

    await dropIndex('IX_ChatMensaje_canal_id');
    await dropIndex('IX_ChatMensaje_parent_id');
    await dropConstraint('ChatLinkPreview', 'UQ_ChatLinkPreview_msg_url');
    await dropIndex('IX_ChatCanal_nombre_lower');
  }
};
// 202509151959440-0022-chat-canal-imagen-grupo.cjs

'use strict';
module.exports = {
  async up(q, S) {
    // imagen_url
    await q.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'ChatCanal' AND column_name = 'imagen_url'
        ) THEN
          ALTER TABLE "ChatCanal" ADD COLUMN "imagen_url" TEXT;
        END IF;
      END$$;
    `);

    // seed tipo 'grupo' si no existe
    await q.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM "ChatCanalTipo" WHERE codigo='grupo') THEN
          INSERT INTO "ChatCanalTipo"(codigo,nombre,descripcion,created_at,updated_at)
          VALUES ('grupo','Grupo','Grupo creado por usuarios', now(), now());
        END IF;
      END$$;
    `);
  },
  async down(q) {
    try { await q.sequelize.query(`ALTER TABLE "ChatCanal" DROP COLUMN IF EXISTS "imagen_url"`); } catch {}
    try { await q.sequelize.query(`DELETE FROM "ChatCanalTipo" WHERE codigo='grupo'`); } catch {}
  }
}
// backend/db/migrations/0023-feders-erp-and-profile.cjs
'use strict';

module.exports = {
  async up (qi, Sequelize) {
    const t = await qi.sequelize.transaction();
    try {
      // ---- Feder: columnas nuevas
      await qi.addColumn('Feder', 'nombre_legal',     { type: Sequelize.STRING(180) }, { transaction: t });
      await qi.addColumn('Feder', 'dni_tipo',         { type: Sequelize.STRING(20)  }, { transaction: t });
      await qi.addColumn('Feder', 'dni_numero_enc',   { type: Sequelize.TEXT       }, { transaction: t });
      await qi.addColumn('Feder', 'cuil_cuit_enc',    { type: Sequelize.TEXT       }, { transaction: t });
      await qi.addColumn('Feder', 'fecha_nacimiento', { type: Sequelize.DATEONLY   }, { transaction: t });
      await qi.addColumn('Feder', 'domicilio_json',   { type: Sequelize.JSONB      }, { transaction: t });

      // ---- FirmaPerfil
      await qi.createTable('FirmaPerfil', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        feder_id: { type: Sequelize.INTEGER, allowNull: false, unique: true,
          references: { model: 'Feder', key: 'id' }, onDelete: 'CASCADE' },
        firma_textual: { type: Sequelize.STRING(220) },
        dni_tipo: { type: Sequelize.STRING(20) },
        dni_numero_enc: { type: Sequelize.TEXT },
        firma_iniciales_svg: { type: Sequelize.TEXT },
        firma_iniciales_png_url: { type: Sequelize.STRING(512) },
        pin_hash: { type: Sequelize.STRING(255) },
        is_activa: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('now') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('now') }
      }, { transaction: t });

      // ---- FederBanco
      await qi.createTable('FederBanco', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        feder_id: { type: Sequelize.INTEGER, allowNull: false,
          references: { model: 'Feder', key: 'id' }, onDelete: 'CASCADE' },
        banco_nombre: { type: Sequelize.STRING(120) },
        cbu_enc: { type: Sequelize.TEXT, allowNull: false },
        alias_enc: { type: Sequelize.TEXT },
        titular_nombre: { type: Sequelize.STRING(180) },
        es_principal: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('now') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('now') }
      }, { transaction: t });
      await qi.addIndex('FederBanco', ['feder_id'], { transaction: t, name: 'ix_FederBanco_feder' });

      // ---- FederEmergencia
      await qi.createTable('FederEmergencia', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        feder_id: { type: Sequelize.INTEGER, allowNull: false,
          references: { model: 'Feder', key: 'id' }, onDelete: 'CASCADE' },
        nombre: { type: Sequelize.STRING(180), allowNull: false },
        parentesco: { type: Sequelize.STRING(80) },
        telefono: { type: Sequelize.STRING(40) },
        email: { type: Sequelize.STRING(180) },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('now') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('now') }
      }, { transaction: t });
      await qi.addIndex('FederEmergencia', ['feder_id'], { transaction: t, name: 'ix_FederEmergencia_feder' });

      await t.commit();
    } catch (err) { await t.rollback(); throw err; }
  },

  async down (qi) {
    const t = await qi.sequelize.transaction();
    try {
      await qi.dropTable('FederEmergencia', { transaction: t });
      await qi.dropTable('FederBanco', { transaction: t });
      await qi.dropTable('FirmaPerfil', { transaction: t });

      await qi.removeColumn('Feder', 'domicilio_json',   { transaction: t });
      await qi.removeColumn('Feder', 'fecha_nacimiento', { transaction: t });
      await qi.removeColumn('Feder', 'cuil_cuit_enc',    { transaction: t });
      await qi.removeColumn('Feder', 'dni_numero_enc',   { transaction: t });
      await qi.removeColumn('Feder', 'dni_tipo',         { transaction: t });
      await qi.removeColumn('Feder', 'nombre_legal',     { transaction: t });

      await t.commit();
    } catch (err) { await t.rollback(); throw err; }
  }
};
// 202509192040585-0024-notifenvio-unique-to-index.cjs
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
