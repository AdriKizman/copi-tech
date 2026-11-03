// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { registro, login, perfil } = require('../controllers/auth.controller');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');

// Login sigue siendo público
router.post('/login', asyncHandler(login));

// El registro ahora requiere token Y ser admin
router.post('/registro', verificarToken, soloAdmin, asyncHandler(registro));

// Perfil requiere token
router.get('/perfil', verificarToken, asyncHandler(perfil));

module.exports = router;