const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tasaCambio.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');

router.get('/', asyncHandler(ctrl.obtenerActual));
router.get('/historial', verificarToken, asyncHandler(ctrl.listarHistorial));
router.put('/', verificarToken, asyncHandler(ctrl.guardar));

module.exports = router;
