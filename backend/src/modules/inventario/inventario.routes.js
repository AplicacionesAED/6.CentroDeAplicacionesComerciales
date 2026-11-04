const express = require('express');
const validate = require('../../middlewares/validate');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');
const controller = require('./inventario.controller');
const schemas = require('./inventario.schema');

const router = express.Router();

router.use(requireAuth);

router.get('/', requireAdmin, controller.inventarioCompleto);
router.get('/unidades', validate(schemas.unidadesQuerySchema, 'query'), controller.unidades);
router.get('/unidades/:unitId/torre', validate(schemas.unitIdParamsSchema, 'params'), controller.torreDeUnidad);
router.get('/torres', controller.torres);
router.get('/torres/:towerId/accesorios', validate(schemas.towerIdParamsSchema, 'params'), validate(schemas.accesoriosQuerySchema, 'query'), controller.accesorios);
router.post('/asociar-unidad', validate(schemas.asociarUnidadSchema, 'body'), controller.asociarUnidad);
router.post('/asociar-parqueadero', validate(schemas.asociarParqueaderoSchema, 'body'), controller.asociarParqueadero);

module.exports = router;
