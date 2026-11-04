const express = require('express');
const validate = require('../../middlewares/validate');
const { requireAuth } = require('../../middlewares/auth');
const controller = require('./negocio.controller');
const { listarQuerySchema } = require('./negocio.schema');

const router = express.Router();

router.use(requireAuth);

router.get('/', validate(listarQuerySchema, 'query'), controller.listar);
router.get('/tramites', validate(listarQuerySchema, 'query'), controller.tramites);

module.exports = router;
