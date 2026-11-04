const express = require('express');
const { z } = require('zod');
const validate = require('../../middlewares/validate');
const { requireAuth } = require('../../middlewares/auth');
const controller = require('./anexo.controller');

const router = express.Router();
const idNumerico = z.object({ id: z.string().regex(/^\d+$/) });

router.use(requireAuth);

router.get('/archivo/:nombre', controller.archivo);
router.get('/accesorios/:id/plano', validate(idNumerico, 'params'), controller.planoDeAccesorio);
router.get('/unidades/:id/plano-sombreado', validate(idNumerico, 'params'), controller.planoSombreado);
router.get('/proyectos/:nombre/director', controller.director);

module.exports = router;
