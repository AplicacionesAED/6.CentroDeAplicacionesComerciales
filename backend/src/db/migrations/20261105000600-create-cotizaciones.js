'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cotizaciones', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      deal_id: { type: Sequelize.STRING(30), allowNull: false },
      deal_name: { type: Sequelize.TEXT, allowNull: true },
      unit_id: { type: Sequelize.STRING(30), allowNull: false },
      unit_code: { type: Sequelize.STRING(100), allowNull: true },
      unit_tower: { type: Sequelize.STRING(100), allowNull: true },
      unit_floor: { type: Sequelize.INTEGER, allowNull: true },
      // Correo del DUENO del negocio en HubSpot (define quien ve la cotizacion) y de quien la genero de verdad.
      user_email: { type: Sequelize.STRING(255), allowNull: true },
      generated_by_email: { type: Sequelize.STRING(255), allowNull: true },
      quote_type: { type: Sequelize.STRING(50), allowNull: true },
      total_price: { type: Sequelize.DOUBLE, allowNull: true },
      separation: { type: Sequelize.DOUBLE, allowNull: true },
      monthly_payment: { type: Sequelize.DOUBLE, allowNull: true },
      num_installments: { type: Sequelize.INTEGER, allowNull: true },
      balance: { type: Sequelize.DOUBLE, allowNull: true },
      pdf_filename: { type: Sequelize.STRING(255), allowNull: true },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pendiente' },
      snapshot_json: { type: Sequelize.JSONB, allowNull: true },
      parking_id: { type: Sequelize.STRING(30), allowNull: true },
      parking_name: { type: Sequelize.STRING(100), allowNull: true },
      deposito_id: { type: Sequelize.STRING(30), allowNull: true },
      deposito_name: { type: Sequelize.STRING(100), allowNull: true },
      cuarto_util_id: { type: Sequelize.STRING(30), allowNull: true },
      cuarto_util_name: { type: Sequelize.STRING(100), allowNull: true },
      project: { type: Sequelize.STRING(50), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('cotizaciones', ['deal_id']);
    await queryInterface.addIndex('cotizaciones', ['user_email']);
  },
};
