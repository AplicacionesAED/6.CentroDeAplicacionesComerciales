const express = require('express');
const validate = require('../../middlewares/validate');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');
const controller = require('./usuario.controller');
const { crearSchema, actualizarSchema, idParamsSchema } = require('./usuario.schema');

const router = express.Router();

router.use(requireAuth);

router.get('/me', controller.me);

// Administracion de usuarios: solo admin.
router.get('/roles', requireAdmin, controller.listarRoles);
router.get('/', requireAdmin, controller.listar);
router.post('/', requireAdmin, validate(crearSchema, 'body'), controller.crear);
router.patch('/:id', requireAdmin, validate(idParamsSchema, 'params'), validate(actualizarSchema, 'body'), controller.actualizar);
router.post('/:id/regenerar-password', requireAdmin, validate(idParamsSchema, 'params'), controller.regenerarPassword);

module.exports = router;
