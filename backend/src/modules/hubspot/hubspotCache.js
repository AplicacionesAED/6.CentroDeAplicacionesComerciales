// Cache de respuestas de HubSpot en la BD (TTL de 5 min): evita repetir busquedas completas de negocios o
// unidades y toparse con el rate limit de HubSpot. Limpiar una entrada vieja: DELETE FROM hubspot_cache.
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const TTL_MS = 5 * 60 * 1000;

const HubspotCache = sequelize.define(
  'HubspotCache',
  {
    cache_key: { type: DataTypes.STRING(150), primaryKey: true },
    data: { type: DataTypes.JSONB, allowNull: false },
    updated_at: { type: DataTypes.BIGINT, allowNull: false },
  },
  { tableName: 'hubspot_cache', timestamps: false }
);

async function leerCache(clave) {
  const fila = await HubspotCache.findByPk(clave);
  if (!fila || Date.now() - Number(fila.updated_at) > TTL_MS) return null;
  return fila.data;
}

async function guardarCache(clave, data) {
  await HubspotCache.upsert({ cache_key: clave, data, updated_at: Date.now() });
}

module.exports = { HubspotCache, leerCache, guardarCache };
