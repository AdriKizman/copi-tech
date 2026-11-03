const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/proyectosWeb.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');

router.get('/publico/:token', asyncHandler(ctrl.verPublico));
router.get('/qr/:token', asyncHandler(ctrl.generarQR));

router.use(verificarToken);
router.get('/', asyncHandler(ctrl.listar));
router.post('/', asyncHandler(ctrl.crear));
router.patch('/:id/estado', asyncHandler(ctrl.cambiarEstado));
router.post('/:id/enlace', asyncHandler(ctrl.renovarEnlace));
router.post('/:id/tareas', asyncHandler(ctrl.crearTarea));
router.patch('/:proyectoId/tareas/:tareaId/estado', asyncHandler(ctrl.cambiarEstadoTarea));

module.exports = router;
