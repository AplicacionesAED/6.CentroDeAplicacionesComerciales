const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const service = require('./inventario.service');

const unidades = asyncHandler(async (req, res) => ok(res, await service.unidades(req.usuario, req.query)));
const inventarioCompleto = asyncHandler(async (req, res) => ok(res, await service.inventarioCompleto(req.usuario)));
const torres = asyncHandler(async (req, res) => ok(res, await service.torres(req.usuario)));
const torreDeUnidad = asyncHandler(async (req, res) => ok(res, await service.torreDeUnidad(req.usuario, req.params.unitId)));
const accesorios = asyncHandler(async (req, res) => ok(res, await service.accesorios(req.usuario, req.params.towerId, req.query.dealId)));
const asociarUnidad = asyncHandler(async (req, res) => ok(res, await service.asociarUnidad(req.usuario, req.body.dealId, req.body.unitId)));
const asociarParqueadero = asyncHandler(async (req, res) => ok(res, await service.asociarParqueadero(req.usuario, req.body.dealId, req.body.parkingId)));

module.exports = { unidades, inventarioCompleto, torres, torreDeUnidad, accesorios, asociarUnidad, asociarParqueadero };
