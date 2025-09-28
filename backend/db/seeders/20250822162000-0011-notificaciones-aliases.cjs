// 20250822162000-0011-notificaciones-aliases.cjs
'use strict';

module.exports = {
  async up (queryInterface) {
    // Proveedores
    await queryInterface.sequelize.query(`
      INSERT INTO "ProveedorTipo"(codigo,nombre,descripcion)
      VALUES ('gmail_smtp','Gmail SMTP',NULL)
      ON CONFLICT (codigo) DO NOTHING;
    `);
    await queryInterface.sequelize.query(`
      INSERT INTO "ProveedorTipo"(codigo,nombre,descripcion)
      VALUES ('fcm','Firebase Cloud Messaging',NULL)
      ON CONFLICT (codigo) DO NOTHING;
    `);

    // Estados usados por email/push
    await queryInterface.sequelize.query(`
      INSERT INTO "EstadoEnvio"(codigo,nombre,descripcion)
      VALUES
        ('queued','En cola',NULL),
        ('sent','Enviado',NULL),
        ('opened','Abierto',NULL),
        ('error','Error',NULL)
      ON CONFLICT (codigo) DO NOTHING;
    `);

    // Asegurar canal push
    await queryInterface.sequelize.query(`
      INSERT INTO "CanalTipo"(codigo,nombre,descripcion)
      VALUES ('push','Push',NULL)
      ON CONFLICT (codigo) DO NOTHING;
    `);
  },

  async down (queryInterface) {
    await queryInterface.bulkDelete('ProveedorTipo', { codigo: ['gmail_smtp','fcm'] }, {});
    await queryInterface.bulkDelete('EstadoEnvio', { codigo: ['queued','sent','opened','error'] }, {});
    // No borramos 'push' para no romper datos existentes.
  }
};