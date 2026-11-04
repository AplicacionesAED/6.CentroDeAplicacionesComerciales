const asyncHandler = require('../../utils/asyncHandler');
const { ok, created } = require('../../utils/ApiResponse');
const service = require('./usuario.service');

const listarRoles = asyncHandler(async (req, res) => ok(res, await service.listarRoles()));
const listar = asyncHandler(async (req, res) => ok(res, await service.listar()));
const crear = asyncHandler(async (req, res) => created(res, await service.crear(req.body)));
const actualizar = asyncHandler(async (req, res) => ok(res, await service.actualizar(req.params.id, req.body, req.usuario.id)));
const regenerarPassword = asyncHandler(async (req, res) => ok(res, await service.regenerarPassword(req.params.id)));

const me = asyncHandler(async (req, res) => {
  ok(res, await service.getMe(req.usuario));
});

module.exports = { me, listarRoles, listar, crear, actualizar, regenerarPassword };
