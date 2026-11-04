const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');
const { ok } = require('../../utils/ApiResponse');
const service = require('./cotizacion.service');
const aceptacion = require('./aceptacion.service');
const { crearSchema } = require('./cotizacion.schema');

// POST multipart: el PDF va en `pdf` y el resto en el campo `data` (JSON).
const crear = asyncHandler(async (req, res) => {
  let bruto;
  try {
    bruto = JSON.parse(req.body.data || '{}');
  } catch {
    throw new ApiError(400, 'El campo data no es un JSON válido');
  }
  const resultado = crearSchema.safeParse(bruto);
  if (!resultado.success) throw new ApiError(422, 'Datos inválidos', resultado.error.flatten());
  ok(res, await service.crear(req.usuario, resultado.data, req.file));
});

const negociosConCotizaciones = asyncHandler(async (req, res) => ok(res, await service.negociosConCotizaciones(req.usuario)));
const listarTodas = asyncHandler(async (req, res) => ok(res, await service.listarTodas(req.usuario, req.query)));
const exportarPlanes = asyncHandler(async (req, res) => ok(res, await service.exportarPlanesDePago()));
const porNegocio = asyncHandler(async (req, res) => ok(res, await service.porNegocio(req.usuario, req.params.dealId)));
const obtener = asyncHandler(async (req, res) => ok(res, await service.obtener(req.usuario, req.params.id)));
const aceptar = asyncHandler(async (req, res) => ok(res, await aceptacion.aceptar(req.usuario, req.params.id)));
const eliminar = asyncHandler(async (req, res) => ok(res, await service.eliminar(req.params.id)));

// Descarga: responde el binario directo, sin el sobre { data }.
const pdf = asyncHandler(async (req, res) => {
  const { ruta, nombre } = await service.rutaPdf(req.usuario, req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${nombre}"`);
  res.sendFile(ruta);
});

module.exports = { crear, negociosConCotizaciones, listarTodas, exportarPlanes, porNegocio, obtener, aceptar, eliminar, pdf };
