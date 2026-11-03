const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/solicitudes.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');

router.use(verificarToken);

router.get('/', asyncHandler(ctrl.listar));
router.patch('/:id/aceptar', asyncHandler(ctrl.aceptar));

module.exports = router;
