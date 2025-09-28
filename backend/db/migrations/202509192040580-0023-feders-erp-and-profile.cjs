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
