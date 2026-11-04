const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

// Cotizacion generada para un negocio (deal) de HubSpot. Los nombres de columna (ingles, snake_case) se
// conservan de la app vieja a proposito: el frontend y el snapshot del PDF los usan tal cual.
const Cotizacion = sequelize.define(
  'Cotizacion',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    deal_id: { type: DataTypes.STRING(30), allowNull: false },
    deal_name: { type: DataTypes.TEXT, allowNull: true },
    unit_id: { type: DataTypes.STRING(30), allowNull: false },
    unit_code: { type: DataTypes.STRING(100), allowNull: true },
    unit_tower: { type: DataTypes.STRING(100), allowNull: true },
    unit_floor: { type: DataTypes.INTEGER, allowNull: true },
    // Dueno del negocio en HubSpot (define quien ve la cotizacion) y quien la genero de verdad.
    user_email: { type: DataTypes.STRING(255), allowNull: true },
    generated_by_email: { type: DataTypes.STRING(255), allowNull: true },
    quote_type: { type: DataTypes.STRING(50), allowNull: true },
    total_price: { type: DataTypes.DOUBLE, allowNull: true },
    separation: { type: DataTypes.DOUBLE, allowNull: true },
    monthly_payment: { type: DataTypes.DOUBLE, allowNull: true },
    num_installments: { type: DataTypes.INTEGER, allowNull: true },
    balance: { type: DataTypes.DOUBLE, allowNull: true },
    pdf_filename: { type: DataTypes.STRING(255), allowNull: true },
    pdf_drive_id: { type: DataTypes.STRING(100), allowNull: true }, // id del PDF en Google Drive
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pendiente' }, // 'pendiente' | 'aceptada'
    snapshot_json: { type: DataTypes.JSONB, allowNull: true }, // mismos datos que el PDF, para la vista HTML
    parking_id: { type: DataTypes.STRING(30), allowNull: true },
    parking_name: { type: DataTypes.STRING(100), allowNull: true },
    deposito_id: { type: DataTypes.STRING(30), allowNull: true },
    deposito_name: { type: DataTypes.STRING(100), allowNull: true },
    cuarto_util_id: { type: DataTypes.STRING(30), allowNull: true },
    cuarto_util_name: { type: DataTypes.STRING(100), allowNull: true },
    project: { type: DataTypes.STRING(50), allowNull: true },
  },
  { tableName: 'cotizaciones', createdAt: 'created_at', updatedAt: false }
);

module.exports = Cotizacion;
