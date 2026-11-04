// Tabla editable en runtime que es la fuente de permisos por rol (ver utils/permisos.js).
// `es_admin` y `codigo` van ligados a la fila, no al nombre: renombrar un rol no rompe el acceso.
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const Rol = sequelize.define(
  'Rol',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(30), allowNull: false, unique: true }, // ej. "ADMIN", "VENDEDOR"
    // Array de slugs de funcionalidades -- ver tienePermiso() en utils/permisos.js.
    permisos: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    // Bypass total. Se siembra por migracion y nunca se expone en un schema de edicion.
    es_admin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // Identificador estable, independiente de `nombre`.
    codigo: { type: DataTypes.STRING(30), allowNull: true, unique: true },
  },
  { tableName: 'roles', underscored: true, createdAt: 'creado_en', updatedAt: 'actualizado_en' }
);

module.exports = Rol;
