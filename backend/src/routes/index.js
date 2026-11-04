// UNICO lugar que mapea rutas URL a routers de modulo.
const express = require('express');

const router = express.Router();

router.use('/auth', require('../modules/auth/auth.routes'));
router.use('/usuarios', require('../modules/usuario/usuario.routes'));
router.use('/hubspot', require('../modules/hubspot/hubspot.routes'));
router.use('/configuracion', require('../modules/configuracion/configuracion.routes'));
router.use('/asesores', require('../modules/asesorProyecto/asesorProyecto.routes'));
router.use('/cotizaciones', require('../modules/cotizacion/cotizacion.routes'));
router.use('/integracion/cotizaciones', require('../modules/cotizacion/cotizacion.integracion.routes'));
router.use('/negocios', require('../modules/negocio/negocio.routes'));
router.use('/inventario', require('../modules/inventario/inventario.routes'));
router.use('/anexos', require('../modules/anexo/anexo.routes'));

module.exports = router;
