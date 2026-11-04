const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

// Ajuste clave-valor. Claves en uso: `projectConfig:<Proyecto>`, `docUrls`, `docFolders`.
const AppSetting = sequelize.define(
  'AppSetting',
  {
    key: { type: DataTypes.STRING(100), primaryKey: true },
    value: { type: DataTypes.JSONB, allowNull: false },
  },
  { tableName: 'app_settings', timestamps: false }
);

module.exports = AppSetting;
