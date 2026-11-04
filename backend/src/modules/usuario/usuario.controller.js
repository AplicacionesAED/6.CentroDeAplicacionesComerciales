const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const service = require('./usuario.service');

const me = asyncHandler(async (req, res) => {
  ok(res, await service.getMe(req.usuario));
});

module.exports = { me };
