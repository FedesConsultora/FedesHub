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
