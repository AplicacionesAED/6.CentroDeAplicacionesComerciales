const asyncHandler = require('../../utils/asyncHandler');
const service = require('./hubspot.service');

// Proxy /api/hubspot/<ruta de HubSpot>: pasa status y cuerpo tal cual los devuelve HubSpot.
const proxy = asyncHandler(async (req, res) => {
  const indiceQuery = req.originalUrl.indexOf('?');
  const respuesta = await service.reenviar(req.usuario.id, {
    metodo: req.method,
    ruta: req.path,
    query: indiceQuery >= 0 ? req.originalUrl.slice(indiceQuery + 1) : '',
    cuerpo: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined,
  });
  const texto = await respuesta.text();
  res.status(respuesta.status).type(respuesta.headers.get('content-type') || 'application/json').send(texto);
});

module.exports = { proxy };
