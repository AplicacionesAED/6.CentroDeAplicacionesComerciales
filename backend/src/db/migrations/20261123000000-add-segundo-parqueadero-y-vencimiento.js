'use strict';

// Segundo parqueadero de una cotizacion (libre para venta, solo Oliv), con el mismo patron que parking_id/parking_name,
// y marca de cuando el vencimiento automatico ya proceso la cotizacion (ver modules/cotizacion/vencimiento.js).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cotizaciones', 'parking2_id', { type: Sequelize.STRING(30), allowNull: true });
    await queryInterface.addColumn('cotizaciones', 'parking2_name', { type: Sequelize.STRING(100), allowNull: true });
    await queryInterface.addColumn('cotizaciones', 'vencida_procesada_at', { type: Sequelize.DATE, allowNull: true });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('cotizaciones', 'vencida_procesada_at');
    await queryInterface.removeColumn('cotizaciones', 'parking2_name');
    await queryInterface.removeColumn('cotizaciones', 'parking2_id');
  },
};
