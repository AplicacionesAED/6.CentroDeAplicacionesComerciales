'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hubspot_cache', {
      cache_key: { type: Sequelize.STRING(150), primaryKey: true },
      data: { type: Sequelize.JSONB, allowNull: false },
      updated_at: { type: Sequelize.BIGINT, allowNull: false },
    });
  },
};
