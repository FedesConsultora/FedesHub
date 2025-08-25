// 20250828001100-0013-chat-catalogs.cjs

'use strict';

module.exports = {
  async up (q) {
    // Tipos de canal
    await q.sequelize.query(`
      INSERT INTO "ChatCanalTipo"(codigo, nombre, created_at, updated_at)
      VALUES
        ('dm','DM', now(), now()),
        ('grupo','Grupo', now(), now()),
        ('canal','Canal', now(), now()),
        ('celula','Célula', now(), now()),
        ('cliente','Cliente', now(), now())
      ON CONFLICT (codigo) DO NOTHING;
    `);

    // Roles de canal
    await q.sequelize.query(`
      INSERT INTO "ChatRolTipo"(codigo, nombre, created_at, updated_at)
      VALUES
        ('owner','Owner', now(), now()),
        ('admin','Admin', now(), now()),
        ('mod','Moderador', now(), now()),
        ('member','Miembro', now(), now()),
        ('guest','Invitado', now(), now())
      ON CONFLICT (codigo) DO NOTHING;
    `);
  },

  async down (q) {
    // En general no se bajan catálogos, pero lo dejamos por si querés limpiar:
    await q.sequelize.query(`DELETE FROM "ChatRolTipo"   WHERE codigo IN ('owner','admin','mod','member','guest');`);
    await q.sequelize.query(`DELETE FROM "ChatCanalTipo" WHERE codigo IN ('dm','grupo','canal','celula','cliente');`);
  }
};
