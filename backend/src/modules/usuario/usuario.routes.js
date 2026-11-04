const express = require('express');
const { requireAuth } = require('../../middlewares/auth');
const controller = require('./usuario.controller');

const router = express.Router();

router.get('/me', requireAuth, controller.me);

module.exports = router;
