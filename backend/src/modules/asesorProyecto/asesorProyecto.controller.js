const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const service = require('./asesorProyecto.service');

const asignar = asyncHandler(async (req, res) => ok(res, await service.asignar(req.params.usuarioId, req.body.projects)));

module.exports = { asignar };
