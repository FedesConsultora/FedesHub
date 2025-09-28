'use strict';

/**. 202508566000000-0011-chat-core.cjs
 * Módulo 11 - Chat (robusta / compatible con placeholder de M10)
 */
module.exports = {
  async up(q, S) {
    const NOW = S.fn('now');

    // Helpers
    const hasTable = async (t) => { try { await q.describeTable(t); return true; } catch { return false; } };
    const hasColumn = async (t, c) => { try { const d = await q.describeTable(t); return !!d[c]; } catch { return false; } };
    const safeAddIndex = async (table, fields, name) => {
      try { await q.addIndex(table, { fields, name }); } catch {}
    };
    const safeAddConstraint = async (table, opts) => { try { await q.addConstraint(table, opts); } catch {} };
    const safeAddColumn = async (table, col, def) => { if (!(await hasColumn(table, col))) await q.addColumn(table, col, def); };

    /* ========== 1) Catálogos ========== */
    if (!(await hasTable('ChatCanalTipo'))) {
      await q.createTable('ChatCanalTipo', {
        id: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
        codigo: { type: S.STRING(20), allowNull: false, unique: true },
        nombre: { type: S.STRING(60), allowNull: false },
        descripcion: { type: S.TEXT },
        created_at: { type: S.DATE, defaultValue: NOW },
        updated_at: { type: S.DATE, defaultValue: NOW }
      });
    }

    if (!(await hasTable('ChatRolTipo'))) {
      await q.createTable('ChatRolTipo', {
        id: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
        codigo: { type: S.STRING(20), allowNull: false, unique: true },
        nombre: { type: S.STRING(60), allowNull: false },
        descripcion: { type: S.TEXT },
        created_at: { type: S.DATE, defaultValue: NOW },
        updated_at: { type: S.DATE, defaultValue: NOW }
      });
    }

    // Seed mínimos (idempotente)
    await q.sequelize.query(`
      INSERT INTO "ChatCanalTipo"(codigo, nombre)
      VALUES ('dm','DM'), ('grupo','Grupo'), ('canal','Canal'), ('celula','Célula'), ('cliente','Cliente')
      ON CONFLICT (codigo) DO NOTHING;
    `);
    await q.sequelize.query(`
      INSERT INTO "ChatRolTipo"(codigo, nombre)
      VALUES ('owner','Owner'),('admin','Admin'),('mod','Moderador'),('member','Miembro'),('guest','Invitado')
      ON CONFLICT (codigo) DO NOTHING;
    `);

    /* ========== 2) ChatCanal (crear o evolucionar placeholder) ========== */
    if (!(await hasTable('ChatCanal'))) {
      await q.createTable('ChatCanal', {
        id: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
        tipo_id: {
          type: S.INTEGER, allowNull: false,
          references: { model: 'ChatCanalTipo', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'RESTRICT'
        },
        nombre: { type: S.STRING(120) },
        slug: { type: S.STRING(120), unique: true },
        topic: { type: S.STRING(240) },
        descripcion: { type: S.TEXT },
        is_privado: { type: S.BOOLEAN, allowNull: false, defaultValue: true },
        is_archivado: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
        only_mods_can_post: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
        slowmode_seconds: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
        celula_id: { type: S.INTEGER, references: { model: 'Celula', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        cliente_id:{ type: S.INTEGER, references: { model: 'Cliente', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        created_by_user_id: { type: S.INTEGER, references: { model: 'User', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        created_at: { type: S.DATE, defaultValue: NOW },
        updated_at: { type: S.DATE, defaultValue: NOW }
      });
    } else {
      // Evolucionar placeholder: agregar columnas faltantes
      await safeAddColumn('ChatCanal', 'tipo_id', { type: S.INTEGER, allowNull: true });
      await safeAddColumn('ChatCanal', 'topic', { type: S.STRING(240) });
      await safeAddColumn('ChatCanal', 'descripcion', { type: S.TEXT });
      await safeAddColumn('ChatCanal', 'only_mods_can_post', { type: S.BOOLEAN, allowNull: false, defaultValue: false });
      await safeAddColumn('ChatCanal', 'slowmode_seconds', { type: S.INTEGER, allowNull: false, defaultValue: 0 });
      await safeAddColumn('ChatCanal', 'celula_id', { type: S.INTEGER });
      await safeAddColumn('ChatCanal', 'cliente_id', { type: S.INTEGER });
      await safeAddColumn('ChatCanal', 'created_by_user_id', { type: S.INTEGER });

      // FKs para las nuevas columnas
      await safeAddConstraint('ChatCanal', {
        fields: ['tipo_id'],
        type: 'foreign key',
        name: 'FK_ChatCanal_tipo',
        references: { table: 'ChatCanalTipo', field: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      });
      await safeAddConstraint('ChatCanal', {
        fields: ['celula_id'],
        type: 'foreign key',
        name: 'FK_ChatCanal_celula',
        references: { table: 'Celula', field: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      });
      await safeAddConstraint('ChatCanal', {
        fields: ['cliente_id'],
        type: 'foreign key',
        name: 'FK_ChatCanal_cliente',
        references: { table: 'Cliente', field: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      });
      await safeAddConstraint('ChatCanal', {
        fields: ['created_by_user_id'],
        type: 'foreign key',
        name: 'FK_ChatCanal_created_by',
        references: { table: 'User', field: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      });

      // Migrar datos desde la columna vieja 'tipo' si existe
      if (await hasColumn('ChatCanal', 'tipo')) {
        await q.sequelize.query(`
          UPDATE "ChatCanal" c
          SET tipo_id = t.id
          FROM "ChatCanalTipo" t
          WHERE c.tipo_id IS NULL AND t.codigo = c.tipo
        `);
        // Hacer NOT NULL si ya está mapeado
        await q.changeColumn('ChatCanal', 'tipo_id', { type: S.INTEGER, allowNull: false });
        // (opcional) eliminar columna vieja
        try { await q.removeColumn('ChatCanal', 'tipo'); } catch {}
      } else {
        // Si no había columna vieja, simplemente asegurar NOT NULL
        try { await q.changeColumn('ChatCanal', 'tipo_id', { type: S.INTEGER, allowNull: false }); } catch {}
      }
    }

    await safeAddIndex('ChatCanal', ['tipo_id'], 'IX_ChatCanal_tipo_id');
    await safeAddIndex('ChatCanal', ['is_archivado'], 'IX_ChatCanal_archivado');
    await safeAddIndex('ChatCanal', ['celula_id'], 'IX_ChatCanal_celula');
    await safeAddIndex('ChatCanal', ['cliente_id'], 'IX_ChatCanal_cliente');

    /* ========== 3) Mensajes (antes que CanalMiembro por FK last_read_msg_id) ========== */
    if (!(await hasTable('ChatMensaje'))) {
      await q.createTable('ChatMensaje', {
        id: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
        canal_id: {
          type: S.INTEGER, allowNull: false,
          references: { model: 'ChatCanal', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'CASCADE'
        },
        user_id: {
          type: S.INTEGER, allowNull: false,
          references: { model: 'User', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'SET NULL'
        },
        feder_id: { type: S.INTEGER, references: { model: 'Feder', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        parent_id: { type: S.INTEGER, references: { model: 'ChatMensaje', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        client_msg_id: { type: S.STRING(64) },
        body_text: { type: S.TEXT },
        body_json: { type: S.JSONB },
        is_edited: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
        edited_at: { type: S.DATE },
        deleted_at: { type: S.DATE },
        deleted_by_user_id: { type: S.INTEGER, references: { model: 'User', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        reply_count: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
        last_reply_at: { type: S.DATE },
        created_at: { type: S.DATE, defaultValue: NOW },
        updated_at: { type: S.DATE, defaultValue: NOW }
      });

      await q.addIndex('ChatMensaje', ['canal_id', 'created_at'], { name: 'IX_ChatMensaje_canal_created' });
      await q.addIndex('ChatMensaje', ['parent_id', 'created_at'], { name: 'IX_ChatMensaje_parent_created' });
      await q.addIndex('ChatMensaje', ['user_id', 'created_at'], { name: 'IX_ChatMensaje_user_created' });

      // Unique parcial para idempotencia
      await q.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='UQ_ChatMensaje_canal_clientmsg'
          ) THEN
            CREATE UNIQUE INDEX "UQ_ChatMensaje_canal_clientmsg"
            ON "ChatMensaje"(canal_id, client_msg_id)
            WHERE client_msg_id IS NOT NULL;
          END IF;
        END$$;
      `);

      // FTS opcional
      await q.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='IX_ChatMensaje_fts'
          ) THEN
            CREATE INDEX "IX_ChatMensaje_fts"
            ON "ChatMensaje" USING GIN (to_tsvector('simple', coalesce(body_text, '')));
          END IF;
        END$$;
      `);
    }

    /* ========== 4) ChatCanalMiembro (ahora sí) ========== */
    if (!(await hasTable('ChatCanalMiembro'))) {
      await q.createTable('ChatCanalMiembro', {
        id: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
        canal_id: {
          type: S.INTEGER, allowNull: false,
          references: { model: 'ChatCanal', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'CASCADE'
        },
        user_id: {
          type: S.INTEGER, allowNull: false,
          references: { model: 'User', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'CASCADE'
        },
        feder_id: { type: S.INTEGER, references: { model: 'Feder', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        rol_id: {
          type: S.INTEGER, allowNull: false,
          references: { model: 'ChatRolTipo', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'RESTRICT'
        },
        is_mute: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
        notif_level: { type: S.STRING(20), allowNull: false, defaultValue: 'all' },
        last_read_msg_id: { type: S.INTEGER, references: { model: 'ChatMensaje', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        last_read_at: { type: S.DATE },
        joined_at: { type: S.DATE, defaultValue: NOW },
        left_at: { type: S.DATE }
      });
      await q.addIndex('ChatCanalMiembro', ['user_id', 'canal_id'], { name: 'IX_ChatCanalMiembro_user_canal' });
      await safeAddConstraint('ChatCanalMiembro', {
        fields: ['canal_id', 'user_id'],
        type: 'unique',
        name: 'UQ_ChatCanalMiembro_canal_user'
      });
      await q.addIndex('ChatCanalMiembro', ['rol_id'], { name: 'IX_ChatCanalMiembro_rol' });
    }

    /* ========== 5) Resto del core (idéntico al diseño) ========== */
    if (!(await hasTable('ChatMensajeEditHist'))) {
      await q.createTable('ChatMensajeEditHist', {
        id: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
        mensaje_id: { type: S.INTEGER, allowNull: false,
          references: { model: 'ChatMensaje', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        version_num: { type: S.INTEGER, allowNull: false },
        body_text: { type: S.TEXT },
        body_json: { type: S.JSONB },
        edited_at: { type: S.DATE, allowNull: false, defaultValue: NOW },
        edited_by_user_id: { type: S.INTEGER, references: { model: 'User', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' }
      });
      await safeAddConstraint('ChatMensajeEditHist', {
        fields: ['mensaje_id','version_num'],
        type: 'unique',
        name: 'UQ_ChatMsgEdit_msg_ver'
      });
    }

    if (!(await hasTable('ChatReaccion'))) {
      await q.createTable('ChatReaccion', {
        id: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
        mensaje_id: { type: S.INTEGER, allowNull: false,
          references: { model: 'ChatMensaje', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        user_id: { type: S.INTEGER, allowNull: false,
          references: { model: 'User', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        emoji: { type: S.STRING(80), allowNull: false },
        created_at: { type: S.DATE, defaultValue: NOW }
      });
      await q.addIndex('ChatReaccion', ['mensaje_id'], { name: 'IX_ChatReaccion_msg' });
      await safeAddConstraint('ChatReaccion', {
        fields: ['mensaje_id','user_id','emoji'],
        type: 'unique',
        name: 'UQ_ChatReaccion_msg_user_emoji'
      });
    }

    if (!(await hasTable('ChatAdjunto'))) {
      await q.createTable('ChatAdjunto', {
        id: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
        mensaje_id: { type: S.INTEGER, allowNull: false,
          references: { model: 'ChatMensaje', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        file_url: { type: S.TEXT, allowNull: false },
        file_name: { type: S.STRING(255) },
        mime_type: { type: S.STRING(160) },
        size_bytes: { type: S.BIGINT },
        width: { type: S.INTEGER },
        height: { type: S.INTEGER },
        duration_sec: { type: S.INTEGER },
        created_at: { type: S.DATE, defaultValue: NOW }
      });
      await q.addIndex('ChatAdjunto', ['mensaje_id'], { name: 'IX_ChatAdjunto_msg' });
    }

    if (!(await hasTable('ChatMensajeRef'))) {
      await q.createTable('ChatMensajeRef', {
        id: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
        mensaje_id: { type: S.INTEGER, allowNull: false,
          references: { model: 'ChatMensaje', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        tarea_id: { type: S.INTEGER, references: { model: 'Tarea', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        evento_id:{ type: S.INTEGER, references: { model: 'Evento', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        ausencia_id: { type: S.INTEGER, references: { model: 'Ausencia', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        asistencia_registro_id: { type: S.INTEGER, references: { model: 'AsistenciaRegistro', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        cliente_id: { type: S.INTEGER, references: { model: 'Cliente', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        celula_id: { type: S.INTEGER, references: { model: 'Celula', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        feder_id: { type: S.INTEGER, references: { model: 'Feder', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' }
      });
      await safeAddConstraint('ChatMensajeRef', { fields: ['mensaje_id'], type: 'unique', name: 'UQ_ChatMensajeRef_msg' });
      await q.addIndex('ChatMensajeRef', ['tarea_id'], { name: 'IX_ChatMensajeRef_tarea' });
      await q.addIndex('ChatMensajeRef', ['evento_id'], { name: 'IX_ChatMensajeRef_evento' });
      await q.addIndex('ChatMensajeRef', ['cliente_id'], { name: 'IX_ChatMensajeRef_cliente' });
      await q.addIndex('ChatMensajeRef', ['celula_id'], { name: 'IX_ChatMensajeRef_celula' });
      await q.addIndex('ChatMensajeRef', ['feder_id'], { name: 'IX_ChatMensajeRef_feder' });
    }

    if (!(await hasTable('ChatLinkPreview'))) {
      await q.createTable('ChatLinkPreview', {
        id: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
        mensaje_id: { type: S.INTEGER, allowNull: false,
          references: { model: 'ChatMensaje', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        url: { type: S.TEXT, allowNull: false },
        title: { type: S.STRING(255) },
        description: { type: S.TEXT },
        image_url: { type: S.TEXT },
        site_name: { type: S.STRING(120) },
        resolved_at: { type: S.DATE }
      });
      await q.addIndex('ChatLinkPreview', ['mensaje_id'], { name: 'IX_ChatLinkPreview_msg' });
      await q.addIndex('ChatLinkPreview', ['url'], { name: 'IX_ChatLinkPreview_url' });
    }

    if (!(await hasTable('ChatReadReceipt'))) {
      await q.createTable('ChatReadReceipt', {
        id: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
        mensaje_id: { type: S.INTEGER, allowNull: false,
          references: { model: 'ChatMensaje', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        user_id: { type: S.INTEGER, allowNull: false,
          references: { model: 'User', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        read_at: { type: S.DATE, allowNull: false, defaultValue: NOW }
      });
      await safeAddConstraint('ChatReadReceipt', { fields: ['mensaje_id','user_id'], type: 'unique', name: 'UQ_ChatReadReceipt_msg_user' });
      await q.addIndex('ChatReadReceipt', ['user_id','mensaje_id'], { name: 'IX_ChatReadReceipt_user_msg' });
    }

    if (!(await hasTable('ChatDelivery'))) {
      await q.createTable('ChatDelivery', {
        id: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
        mensaje_id: { type: S.INTEGER, allowNull: false,
          references: { model: 'ChatMensaje', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        user_id: { type: S.INTEGER, allowNull: false,
          references: { model: 'User', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        delivered_at: { type: S.DATE, allowNull: false, defaultValue: NOW }
      });
      await safeAddConstraint('ChatDelivery', { fields: ['mensaje_id','user_id'], type: 'unique', name: 'UQ_ChatDelivery_msg_user' });
    }

    if (!(await hasTable('ChatPin'))) {
      await q.createTable('ChatPin', {
        id: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
        canal_id: { type: S.INTEGER, allowNull: false,
          references: { model: 'ChatCanal', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        mensaje_id: { type: S.INTEGER, allowNull: false,
          references: { model: 'ChatMensaje', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        pinned_by_user_id: { type: S.INTEGER, references: { model: 'User', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        pin_orden: { type: S.INTEGER },
        pinned_at: { type: S.DATE, defaultValue: NOW }
      });
      await safeAddConstraint('ChatPin', { fields: ['canal_id','mensaje_id'], type: 'unique', name: 'UQ_ChatPin_canal_msg' });
      await q.addIndex('ChatPin', ['canal_id','pin_orden'], { name: 'IX_ChatPin_canal_orden' });
    }

    if (!(await hasTable('ChatSavedMessage'))) {
      await q.createTable('ChatSavedMessage', {
        id: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: S.INTEGER, allowNull: false,
          references: { model: 'User', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        mensaje_id: { type: S.INTEGER, allowNull: false,
          references: { model: 'ChatMensaje', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        saved_at: { type: S.DATE, defaultValue: NOW }
      });
      await safeAddConstraint('ChatSavedMessage', { fields: ['user_id','mensaje_id'], type: 'unique', name: 'UQ_ChatSaved_user_msg' });
    }

    if (!(await hasTable('ChatThreadFollow'))) {
      await q.createTable('ChatThreadFollow', {
        id: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
        root_msg_id: { type: S.INTEGER, allowNull: false,
          references: { model: 'ChatMensaje', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        user_id: { type: S.INTEGER, allowNull: false,
          references: { model: 'User', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        followed_at: { type: S.DATE, defaultValue: NOW }
      });
      await safeAddConstraint('ChatThreadFollow', { fields: ['root_msg_id','user_id'], type: 'unique', name: 'UQ_ChatThreadFollow_root_user' });
    }

    if (!(await hasTable('ChatInvitacion'))) {
      await q.createTable('ChatInvitacion', {
        id: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
        canal_id: { type: S.INTEGER, allowNull: false,
          references: { model: 'ChatCanal', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        invited_user_id: { type: S.INTEGER, references: { model: 'User', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        invited_email: { type: S.STRING(255) },
        invited_by_user_id: { type: S.INTEGER, allowNull: false,
          references: { model: 'User', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        status: { type: S.STRING(20), allowNull: false, defaultValue: 'pending' },
        token: { type: S.STRING(64), unique: true },
        expires_at: { type: S.DATE },
        created_at: { type: S.DATE, defaultValue: NOW },
        responded_at: { type: S.DATE }
      });
      await q.addIndex('ChatInvitacion', ['canal_id'], { name: 'IX_ChatInvitacion_canal' });
      await q.addIndex('ChatInvitacion', ['invited_user_id'], { name: 'IX_ChatInvitacion_user' });
      await q.addIndex('ChatInvitacion', ['invited_email'], { name: 'IX_ChatInvitacion_email' });
    }

    if (!(await hasTable('ChatMeeting'))) {
      await q.createTable('ChatMeeting', {
        id: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
        canal_id: { type: S.INTEGER, allowNull: false,
          references: { model: 'ChatCanal', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        provider_codigo: { type: S.STRING(30), allowNull: false },
        external_meeting_id: { type: S.STRING(128) },
        join_url: { type: S.TEXT },
        created_by_user_id: { type: S.INTEGER, references: { model: 'User', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        starts_at: { type: S.DATE },
        ends_at: { type: S.DATE },
        evento_id: { type: S.INTEGER, references: { model: 'Evento', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        mensaje_id: { type: S.INTEGER, references: { model: 'ChatMensaje', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        created_at: { type: S.DATE, defaultValue: NOW }
      });
      await q.addIndex('ChatMeeting', ['canal_id'], { name: 'IX_ChatMeeting_canal' });
      await q.addIndex('ChatMeeting', ['evento_id'], { name: 'IX_ChatMeeting_evento' });
      await q.addIndex('ChatMeeting', ['mensaje_id'], { name: 'IX_ChatMeeting_mensaje' });
    }

    if (!(await hasTable('ChatPresence'))) {
      await q.createTable('ChatPresence', {
        user_id: { type: S.INTEGER, primaryKey: true,
          references: { model: 'User', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        status: { type: S.STRING(10), allowNull: false, defaultValue: 'offline' },
        device: { type: S.STRING(60) },
        last_seen_at: { type: S.DATE },
        updated_at: { type: S.DATE, defaultValue: NOW }
      });
    }

    if (!(await hasTable('ChatTyping'))) {
      await q.createTable('ChatTyping', {
        id: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
        canal_id: { type: S.INTEGER, allowNull: false,
          references: { model: 'ChatCanal', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        user_id: { type: S.INTEGER, allowNull: false,
          references: { model: 'User', key: 'id' },
          onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        started_at: { type: S.DATE, defaultValue: NOW },
        expires_at: { type: S.DATE, allowNull: false }
      });
      await q.addIndex('ChatTyping', ['canal_id'], { name: 'IX_ChatTyping_canal' });
      await q.addIndex('ChatTyping', ['expires_at'], { name: 'IX_ChatTyping_exp' });
      await safeAddConstraint('ChatTyping', { fields: ['canal_id','user_id'], type: 'unique', name: 'UQ_ChatTyping_canal_user' });
    }
  },

  async down(q) {
    // Reversion en orden inverso (drop si existen)
    const drop = async (t) => { try { await q.dropTable(t); } catch {} };
    await drop('ChatTyping');
    await drop('ChatPresence');
    await drop('ChatMeeting');
    await drop('ChatInvitacion');
    await drop('ChatThreadFollow');
    await drop('ChatSavedMessage');
    await drop('ChatPin');
    await drop('ChatDelivery');
    await drop('ChatReadReceipt');
    await drop('ChatLinkPreview');
    await drop('ChatMensajeRef');
    await drop('ChatAdjunto');
    await drop('ChatReaccion');
    await drop('ChatMensajeEditHist');
    await drop('ChatCanalMiembro');
    await drop('ChatMensaje');
    // OJO: no dropeamos ChatCanal si proviene del placeholder de M10; si querés, descomenta:
    // await drop('ChatCanal');
    await drop('ChatRolTipo');
    await drop('ChatCanalTipo');
  }
};
