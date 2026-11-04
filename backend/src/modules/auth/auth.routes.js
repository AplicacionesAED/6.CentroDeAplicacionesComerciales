const express = require('express');
const validate = require('../../middlewares/validate');
const { requireAuth } = require('../../middlewares/auth');
const controller = require('./auth.controller');
const azure = require('./auth.azure');
const hubspot = require('./auth.hubspot');
const { loginSchema, cambiarPasswordSchema } = require('./auth.schema');

const router = express.Router();

router.post('/login', validate(loginSchema, 'body'), controller.login);
router.post('/logout', controller.logout);
router.post('/refresh', controller.refresh);
router.post('/cambiar-password', requireAuth, validate(cambiarPasswordSchema, 'body'), controller.cambiarPassword);

// SSO de Azure AD -- ver auth.azure.js. /login y /callback son navegaciones
// de nivel superior del navegador (no fetch/XHR), por eso son GET.
router.get('/azure/login', azure.iniciarLogin);
router.get('/azure/link', requireAuth, azure.iniciarVinculacion);
router.get('/azure/callback', azure.callback);
router.post('/azure/unlink', requireAuth, azure.desvincular);

// Login con HubSpot (OAuth2) -- ver auth.hubspot.js. Tambien navegaciones de nivel superior.
router.get('/hubspot/login', hubspot.iniciarLogin);
router.get('/hubspot/callback', hubspot.callback);

module.exports = router;
