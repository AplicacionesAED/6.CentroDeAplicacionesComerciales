const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const service = require('./negocio.service');

const listar = asyncHandler(async (req, res) => ok(res, await service.listar(req.usuario, req.query)));
const tramites = asyncHandler(async (req, res) => ok(res, await service.tramites(req.usuario, req.query)));

module.exports = { listar, tramites };
