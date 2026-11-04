const express = require('express');
const multer = require('multer');
const validate = require('../../middlewares/validate');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');
const controller = require('./configuracion.controller');
const { proyectoParamsSchema, proyectoConfigSchema, docUrlsSchema, docFoldersSchema } = require('./configuracion.schema');

const router = express.Router();
const subidaWord = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.use(requireAuth);

router.get('/proyectos', controller.getConfigsProyectos);
router.put('/proyectos/:proyecto', requireAdmin, validate(proyectoParamsSchema, 'params'), validate(proyectoConfigSchema, 'body'), controller.setConfigProyecto);

router.get('/doc-urls', controller.getDocUrls);
router.put('/doc-urls', requireAdmin, validate(docUrlsSchema, 'body'), controller.setDocUrls);

router.get('/doc-folders', controller.getDocFolders);
router.put('/doc-folders', requireAdmin, validate(docFoldersSchema, 'body'), controller.setDocFolders);

router.post('/doc-upload', requireAdmin, subidaWord.single('file'), controller.subirDocumento);

module.exports = router;
