const express = require('express');
const { z } = require('zod');
const validate = require('../../middlewares/validate');
const { requireIntegracion } = require('../../middlewares/integracion');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const { aceptadasPorNegocio } = require('./cotizacion.integracion');

const router = express.Router();

// `dealIds`: ids de negocio de HubSpot separados por coma (varios por llamada, para no pedir uno por uno).
const querySchema = z.object({
  dealIds: z.string().min(1).transform((s) => [...new Set(s.split(',').map((id) => id.trim()).filter(Boolean))]).pipe(z.array(z.string().max(30)).min(1).max(500)),
});

router.use(requireIntegracion);

router.get('/aceptadas', validate(querySchema, 'query'), asyncHandler(async (req, res) => ok(res, await aceptadasPorNegocio(req.query.dealIds))));

module.exports = router;
