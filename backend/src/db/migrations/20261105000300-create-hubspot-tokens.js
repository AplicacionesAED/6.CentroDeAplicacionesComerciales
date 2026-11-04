'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hubspot_tokens', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE',
      },
      access_token_cifrado: { type: Sequelize.TEXT, allowNull: false },
      refresh_token_cifrado: { type: Sequelize.TEXT, allowNull: false },
      expira_en: { type: Sequelize.DATE, allowNull: false },
      creado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      actualizado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
};
