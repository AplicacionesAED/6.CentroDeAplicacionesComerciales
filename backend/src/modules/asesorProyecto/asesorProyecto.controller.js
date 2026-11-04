const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const service = require('./asesorProyecto.service');

const misProyectos = asyncHandler(async (req, res) => ok(res, await service.misProyectos(req.usuario)));
const listar = asyncHandler(async (req, res) => ok(res, await service.listar()));
const asignar = asyncHandler(async (req, res) => ok(res, await service.asignar(req.params.usuarioId, req.body.projects)));

module.exports = { misProyectos, listar, asignar };
