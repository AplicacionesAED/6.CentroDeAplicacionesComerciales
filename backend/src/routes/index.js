// UNICO lugar que mapea rutas URL a routers de modulo.
const express = require('express');

const router = express.Router();

router.use('/auth', require('../modules/auth/auth.routes'));
router.use('/usuarios', require('../modules/usuario/usuario.routes'));
router.use('/hubspot', require('../modules/hubspot/hubspot.routes'));

module.exports = router;
