'use strict';

// El PDF de cada cotizacion vive en Google Drive: se guarda su id. `pdf_filename` conserva el nombre original
// (de el sale el numero de cotizacion que se muestra en pantalla).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cotizaciones', 'pdf_drive_id', { type: Sequelize.STRING(100), allowNull: true });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('cotizaciones', 'pdf_drive_id');
  },
};
