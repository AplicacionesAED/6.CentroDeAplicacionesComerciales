// Unico lugar que carga TODOS los modelos y llama a su associate(models). Se requiere una sola vez
// desde app.js, antes de que cualquier query use una asociacion.
const Usuario = require('../modules/usuario/usuario.model');
const Rol = require('../modules/rol/rol.model');
const HubspotToken = require('../modules/hubspot/hubspotToken.model');
const { HubspotCache } = require('../modules/hubspot/hubspotCache');
const AppSetting = require('../modules/configuracion/appSetting.model');
const AsesorProyecto = require('../modules/asesorProyecto/asesorProyecto.model');
const Cotizacion = require('../modules/cotizacion/cotizacion.model');

const models = { Usuario, Rol, HubspotToken, HubspotCache, AppSetting, AsesorProyecto, Cotizacion };

Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') model.associate(models);
});

module.exports = models;
