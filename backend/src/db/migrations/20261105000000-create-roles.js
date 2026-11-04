'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('roles', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      nombre: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      permisos: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      es_admin: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      codigo: { type: Sequelize.STRING(30), allowNull: true, unique: true },
      creado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      actualizado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
};
