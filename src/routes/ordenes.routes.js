// src/routes/ordenes.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/ordenes.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');
const qrCtrl = require('../controllers/qr.controller');

// ⚠️ RUTA PÚBLICA (debe ir ANTES del router.use de auth)
router.get('/seguimiento/:token', asyncHandler(ctrl.seguimiento));
router.get('/qr/:token', asyncHandler(qrCtrl.generarQR));

// A partir de aquí, todo requiere auth
router.use(verificarToken);
router.get('/stats', asyncHandler(ctrl.estadisticas)); // <-- Debe decir ctrl.estadisticas
router.get('/recordatorios', asyncHandler(ctrl.recordatorios));
router.get('/informe', asyncHandler(ctrl.informe));

router.get('/', asyncHandler(ctrl.listar));
router.get('/:id', asyncHandler(ctrl.ver));
router.post('/', asyncHandler(ctrl.crear));
router.put('/:id', asyncHandler(ctrl.actualizar));
router.patch('/:id/estado', asyncHandler(ctrl.cambiarEstado));
router.post('/:id/token-seguimiento', asyncHandler(ctrl.renovarTokenSeguimiento));
router.delete('/:id', asyncHandler(ctrl.eliminar));

module.exports = router;