// src/routes/clientes.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/clientes.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');

// Todas requieren autenticación
router.use(verificarToken);

router.get('/', asyncHandler(ctrl.listar));
router.get('/:id/ordenes', asyncHandler(ctrl.historial));
router.get('/:id', asyncHandler(ctrl.ver));
router.post('/', asyncHandler(ctrl.crear));
router.put('/:id', asyncHandler(ctrl.actualizar));
router.delete('/:id', asyncHandler(ctrl.eliminar));

module.exports = router;