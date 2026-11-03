const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/contratos.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');

router.get('/publico/:token', asyncHandler(ctrl.verPublico));

router.use(verificarToken);
router.get('/', asyncHandler(ctrl.listar));
router.post('/', asyncHandler(ctrl.crear));
router.get('/:id', asyncHandler(ctrl.ver));
router.patch('/:id/estado', asyncHandler(ctrl.cambiarEstado));
router.post('/:id/pagos', asyncHandler(ctrl.registrarPago));

module.exports = router;
