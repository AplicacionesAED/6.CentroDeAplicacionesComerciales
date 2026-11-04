// Tokens OAuth de HubSpot de cada usuario, SIEMPRE cifrados (ver utils/cifrado.js). Una fila por usuario.
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const HubspotToken = sequelize.define(
  'HubspotToken',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    access_token_cifrado: { type: DataTypes.TEXT, allowNull: false },
    refresh_token_cifrado: { type: DataTypes.TEXT, allowNull: false },
    expira_en: { type: DataTypes.DATE, allowNull: false },
  },
  { tableName: 'hubspot_tokens', underscored: true, createdAt: 'creado_en', updatedAt: 'actualizado_en' }
);

HubspotToken.associate = (models) => {
  HubspotToken.belongsTo(models.Usuario, { foreignKey: 'usuario_id', onDelete: 'CASCADE' });
};

module.exports = HubspotToken;
