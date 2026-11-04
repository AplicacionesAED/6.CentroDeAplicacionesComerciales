// `roles` es un array (un usuario puede tener varios) y `funcionalidades_adicionales` son slugs
// concedidos a mano a ESE usuario por encima de los de su rol (ver utils/permisos.js#tienePermiso).
// `microsoft_id`/`microsoft_email` habilitan el SSO de Azure AD y `hubspot_user_id`/`hubspot_email`
// el login con HubSpot (ver modules/auth). `ultima_conexion` se actualiza en cada login exitoso.
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

// Soft delete: activo=false, nunca se elimina fisicamente.
const Usuario = sequelize.define(
  'Usuario',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    // set() normaliza a minusculas SIEMPRE al guardar -- el login compara
    // case-insensitive (ver auth.service.js#login), asi que el email
    // guardado tiene que ser consistente sin importar como lo haya escrito
    // el usuario al crear la cuenta (mayuscula inicial de autocapitalize,
    // etc.).
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      set(value) {
        this.setDataValue('email', value.toLowerCase());
      },
    },
    nombre: { type: DataTypes.STRING(200), allowNull: false },
    hashed_password: { type: DataTypes.STRING(255), allowNull: false },
    // Nombres de la tabla Rol (ej. ["VENDEDOR"], ["ADMIN"]). El bypass de administrador sale de roles.es_admin.
    roles: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    funcionalidades_adicionales: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    cargo: { type: DataTypes.STRING(150), allowNull: true },
    telefono: { type: DataTypes.STRING(30), allowNull: true },
    microsoft_id: { type: DataTypes.STRING(255), allowNull: true, unique: true },
    microsoft_email: { type: DataTypes.STRING(255), allowNull: true },
    hubspot_user_id: { type: DataTypes.STRING(50), allowNull: true, unique: true },
    hubspot_email: { type: DataTypes.STRING(255), allowNull: true },
    ultima_conexion: { type: DataTypes.DATE, allowNull: true },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    debe_cambiar_password: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { tableName: 'usuarios', underscored: true, createdAt: 'creado_en', updatedAt: 'actualizado_en' }
);

module.exports = Usuario;
