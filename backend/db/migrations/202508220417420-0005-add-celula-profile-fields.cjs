// 0161 — Agrega slug, perfil e imágenes a Celula
'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Celula','slug',       { type: Sequelize.STRING(140), allowNull: false, unique: true, defaultValue: '' });
    // rellenar slugs mínimos
    await queryInterface.sequelize.query(`
      UPDATE "Celula" SET slug = LOWER(regexp_replace(nombre, '[^a-zA-Z0-9]+','-','g')) || '-' || id
      WHERE COALESCE(slug,'') = ''
    `);
    await queryInterface.changeColumn('Celula','slug', { type: Sequelize.STRING(140), allowNull: false, unique: true });
    await queryInterface.addColumn('Celula','perfil_md', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('Celula','avatar_url',{ type: Sequelize.STRING(512), allowNull: true });
    await queryInterface.addColumn('Celula','cover_url', { type: Sequelize.STRING(512), allowNull: true });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Celula','cover_url');
    await queryInterface.removeColumn('Celula','avatar_url');
    await queryInterface.removeColumn('Celula','perfil_md');
    await queryInterface.removeColumn('Celula','slug');
  }
};
