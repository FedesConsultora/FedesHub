
// 202508690001000-0014-chatcanal-add-is_privado.cjs
'use strict';

module.exports = {
  async up (q, S) {
    // agrega la columna sólo si falta (caso placeholder)
    const hasCol = async (t, c) => {
      try { const d = await q.describeTable(t); return !!d[c]; } catch { return false; }
    };
    if (!(await hasCol('ChatCanal', 'is_privado'))) {
      await q.addColumn('ChatCanal', 'is_privado', {
        type: S.BOOLEAN, allowNull: false, defaultValue: true
      });
      // compactar nulls y apretar NOT NULL (defensive)
      await q.sequelize.query(`UPDATE "ChatCanal" SET is_privado = true WHERE is_privado IS NULL;`).catch(()=>{});
      await q.changeColumn('ChatCanal', 'is_privado', { type: S.BOOLEAN, allowNull: false });
      try { await q.addIndex('ChatCanal', ['is_privado'], { name: 'IX_ChatCanal_privado' }); } catch {}
    }
  },

  async down (q) {
    try { await q.removeIndex('ChatCanal', 'IX_ChatCanal_privado'); } catch {}
    try { await q.removeColumn('ChatCanal', 'is_privado'); } catch {}
  }
};
