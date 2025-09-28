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
