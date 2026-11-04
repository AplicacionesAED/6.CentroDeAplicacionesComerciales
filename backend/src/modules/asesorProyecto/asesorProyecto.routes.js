const express = require('express');
const validate = require('../../middlewares/validate');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');
const controller = require('./asesorProyecto.controller');
const { usuarioParamsSchema, asignarSchema } = require('./asesorProyecto.schema');

const router = express.Router();

router.use(requireAuth);

router.put('/:usuarioId', requireAdmin, validate(usuarioParamsSchema, 'params'), validate(asignarSchema, 'body'), controller.asignar);

module.exports = router;
