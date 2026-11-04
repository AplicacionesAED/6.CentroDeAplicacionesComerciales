const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

// Proyectos a los que esta restringido un asesor. Sin filas = sin restriccion (ve todos los proyectos).
const AsesorProyecto = sequelize.define(
  'AsesorProyecto',
  {
    usuario_id: { type: DataTypes.INTEGER, primaryKey: true },
    proyecto: { type: DataTypes.STRING(50), primaryKey: true },
  },
  { tableName: 'asesor_proyectos', timestamps: false }
);

AsesorProyecto.associate = (models) => {
  AsesorProyecto.belongsTo(models.Usuario, { foreignKey: 'usuario_id', onDelete: 'CASCADE' });
};

module.exports = AsesorProyecto;
