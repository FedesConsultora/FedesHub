// 202508220417420-0005-add-celula-profile-fields.cjs
'use strict';

module.exports = {
  async up (q, S) {
    // 1) Agregar slug como NULL y SIN unique (para evitar conflictos)
    const desc = await q.describeTable('Celula');
    if (!desc.slug) {
      await q.addColumn('Celula', 'slug', { type: S.STRING(140), allowNull: true });
    }

    // 2) Backfill de slug
    await q.sequelize.query(`
      UPDATE "Celula"
      SET slug = LOWER(regexp_replace(nombre, '[^a-zA-Z0-9]+','-','g')) || '-' || id
      WHERE slug IS NULL OR slug = ''
    `);

    // 3) NOT NULL + UNIQUE (como constraint con nombre explícito)
    await q.changeColumn('Celula', 'slug', { type: S.STRING(140), allowNull: false });
    await q.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_Celula_slug'
        ) THEN
          ALTER TABLE "Celula" ADD CONSTRAINT "UQ_Celula_slug" UNIQUE (slug);
        END IF;
      END$$;
    `);

    // 4) Otras columnas
    if (!desc.perfil_md)  await q.addColumn('Celula','perfil_md',  { type: S.TEXT });
    if (!desc.avatar_url) await q.addColumn('Celula','avatar_url', { type: S.STRING(512) });
    if (!desc.cover_url)  await q.addColumn('Celula','cover_url',  { type: S.STRING(512) });
  },

  async down (q) {
    await q.sequelize.query(`ALTER TABLE "Celula" DROP CONSTRAINT IF EXISTS "UQ_Celula_slug"`);
    await q.removeColumn('Celula','cover_url').catch(()=>{});
    await q.removeColumn('Celula','avatar_url').catch(()=>{});
    await q.removeColumn('Celula','perfil_md').catch(()=>{});
    await q.removeColumn('Celula','slug').catch(()=>{});
  }
};
