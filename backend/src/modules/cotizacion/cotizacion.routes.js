const express = require('express');
const multer = require('multer');
const validate = require('../../middlewares/validate');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');
const controller = require('./cotizacion.controller');
const { idParamsSchema, dealParamsSchema, listarQuerySchema } = require('./cotizacion.schema');

const router = express.Router();
const subidaPdf = multer({ storage: multer.memoryStorage() });

router.use(requireAuth);

router.post('/', subidaPdf.single('pdf'), controller.crear);
router.get('/deals', controller.negociosConCotizaciones);
router.get('/all', validate(listarQuerySchema, 'query'), controller.listarTodas);
router.get('/export/payment-plans', requireAdmin, controller.exportarPlanes);
router.get('/deal/:dealId', validate(dealParamsSchema, 'params'), controller.porNegocio);
router.get('/:id', validate(idParamsSchema, 'params'), controller.obtener);
router.post('/:id/accept', validate(idParamsSchema, 'params'), controller.aceptar);
router.delete('/:id', requireAdmin, validate(idParamsSchema, 'params'), controller.eliminar);
router.get('/:id/pdf', validate(idParamsSchema, 'params'), controller.pdf);

module.exports = router;
