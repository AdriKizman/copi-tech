// src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.model');

/**
 * Verifica el JWT del header Authorization.
 * Si es válido, adjunta los datos del usuario en req.usuario.
 */
const verificarToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];
  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  const usuario = await Usuario.buscarParaAutenticacion(payload.id);
  if (
    !usuario ||
    Number(usuario.activo) !== 1 ||
    Number(payload.token_version ?? 0) !== Number(usuario.token_version)
  ) {
    return res.status(401).json({ error: 'La sesión ya no es válida' });
  }

  req.usuario = {
    id: usuario.id,
    email: usuario.email,
    rol: usuario.rol,
    token_version: usuario.token_version,
  };
  next();
};

/**
 * Restringe acceso por rol. Uso: soloAdmin
 */
const soloAdmin = async (req, res, next) => {
  if (req.usuario?.rol !== 'admin') {
    return res.status(403).json({ error: 'Requiere rol administrador' });
  }
  next();
};

module.exports = { verificarToken, soloAdmin };