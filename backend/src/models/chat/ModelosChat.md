  // backend/src/models/chat/ChatAdjunto.js

  export default (sequelize, DataTypes) => {
    const ChatAdjunto = sequelize.define('ChatAdjunto', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mensaje_id: { type: DataTypes.INTEGER, allowNull: false },
      file_url: { type: DataTypes.TEXT, allowNull: false },
      file_name: { type: DataTypes.STRING(255) },
      mime_type: { type: DataTypes.STRING(160) },
      size_bytes: { type: DataTypes.BIGINT },
      width: { type: DataTypes.INTEGER },
      height: { type: DataTypes.INTEGER },
      duration_sec: { type: DataTypes.INTEGER },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    }, {
      tableName: 'ChatAdjunto',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: false
    });
    return ChatAdjunto;
  };
  // backend/src/models/chat/ChatCanal.js

  export default (sequelize, DataTypes) => {
    const ChatCanal = sequelize.define('ChatCanal', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      tipo_id: { type: DataTypes.INTEGER, allowNull: false },
      nombre: { type: DataTypes.STRING(120) },
      slug: { type: DataTypes.STRING(120) },
      topic: { type: DataTypes.STRING(240) },
      descripcion: { type: DataTypes.TEXT },
      imagen_url: { type: DataTypes.TEXT },
      is_privado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      is_archivado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      only_mods_can_post: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      slowmode_seconds: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      celula_id: { type: DataTypes.INTEGER },
      cliente_id: { type: DataTypes.INTEGER },
      created_by_user_id: { type: DataTypes.INTEGER },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    }, {
      tableName: 'ChatCanal',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });
    return ChatCanal;
  };
  // backend/src/models/chat/ChatCanalMiembro.js
  export default (sequelize, DataTypes) => {
    const ChatCanalMiembro = sequelize.define('ChatCanalMiembro', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      canal_id: { type: DataTypes.INTEGER, allowNull: false },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      feder_id: { type: DataTypes.INTEGER },
      rol_id: { type: DataTypes.INTEGER, allowNull: false },
      is_mute: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      notif_level: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'all' },
      last_read_msg_id: { type: DataTypes.INTEGER },
      last_read_at: { type: DataTypes.DATE },
      joined_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      left_at: { type: DataTypes.DATE }
    }, {
      tableName: 'ChatCanalMiembro',
      underscored: true,
      timestamps: false
    });
    return ChatCanalMiembro;
  };
  // backend/src/models/chat/ChatCanalTipo.js
  export default (sequelize, DataTypes) => {
    const ChatCanalTipo = sequelize.define('ChatCanalTipo', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      codigo: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      nombre: { type: DataTypes.STRING(60), allowNull: false },
      descripcion: { type: DataTypes.TEXT },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    }, {
      tableName: 'ChatCanalTipo',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });
    return ChatCanalTipo;
  };
  // backend/src/models/chat/ChatDelivery.js

  export default (sequelize, DataTypes) => {
    const ChatDelivery = sequelize.define('ChatDelivery', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mensaje_id: { type: DataTypes.INTEGER, allowNull: false },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      delivered_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    }, {
      tableName: 'ChatDelivery',
      underscored: true,
      timestamps: false
    });
    return ChatDelivery;
  };
  // backend/src/models/chat/ChatInvitacion.js

  export default (sequelize, DataTypes) => {
    const ChatInvitacion = sequelize.define('ChatInvitacion', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      canal_id: { type: DataTypes.INTEGER, allowNull: false },
      invited_user_id: { type: DataTypes.INTEGER },
      invited_email: { type: DataTypes.STRING(255) },
      invited_by_user_id: { type: DataTypes.INTEGER, allowNull: false },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
      token: { type: DataTypes.STRING(64) },
      expires_at: { type: DataTypes.DATE },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      responded_at: { type: DataTypes.DATE }
    }, {
      tableName: 'ChatInvitacion',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: false
    });
    return ChatInvitacion;
  };
  // backend/src/models/chat/ChatLinkPreview.js

  export default (sequelize, DataTypes) => {
    const ChatLinkPreview = sequelize.define('ChatLinkPreview', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mensaje_id: { type: DataTypes.INTEGER, allowNull: false },
      url: { type: DataTypes.TEXT, allowNull: false },
      title: { type: DataTypes.STRING(255) },
      description: { type: DataTypes.TEXT },
      image_url: { type: DataTypes.TEXT },
      site_name: { type: DataTypes.STRING(120) },
      resolved_at: { type: DataTypes.DATE }
    }, {
      tableName: 'ChatLinkPreview',
      underscored: true,
      timestamps: false
    });
    return ChatLinkPreview;
  };
  // backend/src/models/chat/ChatMeeting.js

  export default (sequelize, DataTypes) => {
    const ChatMeeting = sequelize.define('ChatMeeting', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      canal_id: { type: DataTypes.INTEGER, allowNull: false },
      provider_codigo: { type: DataTypes.STRING(30), allowNull: false },
      external_meeting_id: { type: DataTypes.STRING(128) },
      join_url: { type: DataTypes.TEXT },
      created_by_user_id: { type: DataTypes.INTEGER },
      starts_at: { type: DataTypes.DATE },
      ends_at: { type: DataTypes.DATE },
      evento_id: { type: DataTypes.INTEGER },
      mensaje_id: { type: DataTypes.INTEGER },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    }, {
      tableName: 'ChatMeeting',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: false
    });
    return ChatMeeting;
  };
  // backend/src/models/chat/ChatMensaje.js

  export default (sequelize, DataTypes) => {
    const ChatMensaje = sequelize.define('ChatMensaje', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      canal_id: { type: DataTypes.INTEGER, allowNull: false },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      feder_id: { type: DataTypes.INTEGER },
      parent_id: { type: DataTypes.INTEGER },
      client_msg_id: { type: DataTypes.STRING(64) },
      body_text: { type: DataTypes.TEXT },
      body_json: { type: DataTypes.JSONB },
      is_edited: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      edited_at: { type: DataTypes.DATE },
      deleted_at: { type: DataTypes.DATE },
      deleted_by_user_id: { type: DataTypes.INTEGER },
      reply_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      last_reply_at: { type: DataTypes.DATE },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    }, {
      tableName: 'ChatMensaje',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      paranoid: false
    });
    return ChatMensaje;
  };
  // backend/src/models/chat/ChatMensajeEditHist.js

  export default (sequelize, DataTypes) => {
    const ChatMensajeEditHist = sequelize.define('ChatMensajeEditHist', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mensaje_id: { type: DataTypes.INTEGER, allowNull: false },
      version_num: { type: DataTypes.INTEGER, allowNull: false },
      body_text: { type: DataTypes.TEXT },
      body_json: { type: DataTypes.JSONB },
      edited_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      edited_by_user_id: { type: DataTypes.INTEGER }
    }, {
      tableName: 'ChatMensajeEditHist',
      underscored: true,
      timestamps: false
    });
    return ChatMensajeEditHist;
  };
  // backend/src/models/chat/ChatMensajeRef.js

  export default (sequelize, DataTypes) => {
    const ChatMensajeRef = sequelize.define('ChatMensajeRef', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mensaje_id: { type: DataTypes.INTEGER, allowNull: false },
      tarea_id: { type: DataTypes.INTEGER },
      evento_id: { type: DataTypes.INTEGER },
      ausencia_id: { type: DataTypes.INTEGER },
      asistencia_registro_id: { type: DataTypes.INTEGER },
      cliente_id: { type: DataTypes.INTEGER },
      celula_id: { type: DataTypes.INTEGER },
      feder_id: { type: DataTypes.INTEGER }
    }, {
      tableName: 'ChatMensajeRef',
      underscored: true,
      timestamps: false
    });
    return ChatMensajeRef;
  };
  // backend/src/models/chat/ChatPin.js

  export default (sequelize, DataTypes) => {
    const ChatPin = sequelize.define('ChatPin', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      canal_id: { type: DataTypes.INTEGER, allowNull: false },
      mensaje_id: { type: DataTypes.INTEGER, allowNull: false },
      pinned_by_user_id: { type: DataTypes.INTEGER },
      pin_orden: { type: DataTypes.INTEGER },
      pinned_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    }, {
      tableName: 'ChatPin',
      underscored: true,
      timestamps: false
    });
    return ChatPin;
  };

  // backend/src/models/chat/ChatPresence.js

  export default (sequelize, DataTypes) => {
    const ChatPresence = sequelize.define('ChatPresence', {
      user_id: { type: DataTypes.INTEGER, primaryKey: true },
      status: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'offline' },
      device: { type: DataTypes.STRING(60) },
      last_seen_at: { type: DataTypes.DATE },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    }, {
      tableName: 'ChatPresence',
      underscored: true,
      timestamps: false
    });
    return ChatPresence;
  };
  // backend/src/models/chat/ChatReaccion.js

  export default (sequelize, DataTypes) => {
    const ChatReaccion = sequelize.define('ChatReaccion', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mensaje_id: { type: DataTypes.INTEGER, allowNull: false },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      emoji: { type: DataTypes.STRING(80), allowNull: false },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    }, {
      tableName: 'ChatReaccion',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: false
    });
    return ChatReaccion;
  };
  // backend/src/models/chat/ChatReadReceipt.js

  export default (sequelize, DataTypes) => {
    const ChatReadReceipt = sequelize.define('ChatReadReceipt', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      mensaje_id: { type: DataTypes.INTEGER, allowNull: false },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      read_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    }, {
      tableName: 'ChatReadReceipt',
      underscored: true,
      timestamps: false
    });
    return ChatReadReceipt;
  };
  // backend/src/models/chat/ChatRolTipo.js

  export default (sequelize, DataTypes) => {
    const ChatRolTipo = sequelize.define('ChatRolTipo', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      codigo: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      nombre: { type: DataTypes.STRING(60), allowNull: false },
      descripcion: { type: DataTypes.TEXT },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    }, {
      tableName: 'ChatRolTipo',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });
    return ChatRolTipo;
  };
  // backend/src/models/chat/ChatSavedMessage.js

  export default (sequelize, DataTypes) => {
    const ChatSavedMessage = sequelize.define('ChatSavedMessage', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      mensaje_id: { type: DataTypes.INTEGER, allowNull: false },
      saved_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    }, {
      tableName: 'ChatSavedMessage',
      underscored: true,
      timestamps: false
    });
    return ChatSavedMessage;
  };
  // backend/src/models/chat/ChatThreadFollow.js

  export default (sequelize, DataTypes) => {
    const ChatThreadFollow = sequelize.define('ChatThreadFollow', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      root_msg_id: { type: DataTypes.INTEGER, allowNull: false },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      followed_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    }, {
      tableName: 'ChatThreadFollow',
      underscored: true,
      timestamps: false
    });
    return ChatThreadFollow;
  };
  // backend/src/models/chat/ChatTyping.js

  export default (sequelize, DataTypes) => {
    const ChatTyping = sequelize.define('ChatTyping', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      canal_id: { type: DataTypes.INTEGER, allowNull: false },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      started_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      expires_at: { type: DataTypes.DATE, allowNull: false }
    }, {
      tableName: 'ChatTyping',
      underscored: true,
      timestamps: false
    });
    return ChatTyping;
  };
