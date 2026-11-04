const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const service = require('./anexo.service');

// Descarga: responde el binario directo, sin el sobre { data }.
const archivo = asyncHandler(async (req, res) => {
  const { ruta, archivo: nombre } = service.rutaAnexoEstatico(req.params.nombre);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${nombre}"`);
  res.sendFile(ruta);
});

const planoDeAccesorio = asyncHandler(async (req, res) => ok(res, await service.planoDeAccesorio(req.usuario, req.params.id)));
const planoSombreado = asyncHandler(async (req, res) => ok(res, await service.planoSombreado(req.usuario, req.params.id)));
const director = asyncHandler(async (req, res) => ok(res, await service.directorDelProyecto(req.usuario, req.params.nombre)));

module.exports = { archivo, planoDeAccesorio, planoSombreado, director };
