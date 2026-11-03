// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const {
  registro,
  login,
  perfil,
  listarUsuarios,
  obtenerConfiguracionRegistro,
  actualizarConfiguracionRegistro,
  actualizarRol,
  actualizarActivo,
  actualizarPassword,
} = require('../controllers/auth.controller');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');

// Login sigue siendo público
router.post('/login', asyncHandler(login));

// La administración de cuentas y el registro requieren un administrador activo.
router.get('/usuarios', verificarToken, soloAdmin, asyncHandler(listarUsuarios));
router.patch('/usuarios/:id/rol', verificarToken, soloAdmin, asyncHandler(actualizarRol));
router.patch('/usuarios/:id/estado', verificarToken, soloAdmin, asyncHandler(actualizarActivo));
router.patch(
  '/usuarios/:id/password',
  verificarToken,
  soloAdmin,
  asyncHandler(actualizarPassword)
);
router.get(
  '/registro/configuracion',
  verificarToken,
  soloAdmin,
  asyncHandler(obtenerConfiguracionRegistro)
);
router.patch(
  '/registro/configuracion',
  verificarToken,
  soloAdmin,
  asyncHandler(actualizarConfiguracionRegistro)
);
router.post('/registro', verificarToken, soloAdmin, asyncHandler(registro));

// Perfil requiere token
router.get('/perfil', verificarToken, asyncHandler(perfil));

module.exports = router;