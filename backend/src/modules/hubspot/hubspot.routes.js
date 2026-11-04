const express = require('express');
const { requireAuth } = require('../../middlewares/auth');
const controller = require('./hubspot.controller');

const router = express.Router();

router.use(requireAuth, controller.proxy);

module.exports = router;
