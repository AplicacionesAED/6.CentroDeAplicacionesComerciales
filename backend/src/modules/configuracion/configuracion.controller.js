const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const service = require('./configuracion.service');

const getConfigsProyectos = asyncHandler(async (req, res) => ok(res, await service.getConfigsProyectos()));

const setConfigProyecto = asyncHandler(async (req, res) => {
  await service.setConfigProyecto(req.params.proyecto, req.body.config);
  ok(res, { ok: true });
});

const getDocUrls = asyncHandler(async (req, res) => ok(res, await service.getDocUrls()));

const setDocUrls = asyncHandler(async (req, res) => {
  await service.setDocUrls(req.body.docUrls);
  ok(res, { ok: true });
});

const getDocFolders = asyncHandler(async (req, res) => ok(res, await service.getDocFolders()));

const setDocFolders = asyncHandler(async (req, res) => {
  await service.setDocFolders(req.body.docFolders);
  ok(res, { ok: true });
});

const subirDocumento = asyncHandler(async (req, res) => ok(res, await service.subirDocumentoWord(req.usuario, req.file, req.body.project)));

module.exports = { getConfigsProyectos, setConfigProyecto, getDocUrls, setDocUrls, getDocFolders, setDocFolders, subirDocumento };
