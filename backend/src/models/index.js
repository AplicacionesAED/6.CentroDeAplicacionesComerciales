// Unico lugar que carga TODOS los modelos y llama a su associate(models). Se requiere una sola vez
// desde app.js, antes de que cualquier query use una asociacion.
const Usuario = require('../modules/usuario/usuario.model');
const Rol = require('../modules/rol/rol.model');
const HubspotToken = require('../modules/hubspot/hubspotToken.model');

const models = { Usuario, Rol, HubspotToken };

Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') model.associate(models);
});

module.exports = models;
