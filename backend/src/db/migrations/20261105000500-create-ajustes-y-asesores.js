'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Ajustes clave-valor (config financiera por proyecto, enlaces y carpetas de documentacion).
    await queryInterface.createTable('app_settings', {
      key: { type: Sequelize.STRING(100), primaryKey: true },
      value: { type: Sequelize.JSONB, allowNull: false },
    });

    // Proyectos a los que esta restringido un asesor. Sin filas = sin restriccion (ve todos).
    await queryInterface.createTable('asesor_proyectos', {
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE',
      },
      proyecto: { type: Sequelize.STRING(50), allowNull: false, primaryKey: true },
    });
  },
};
