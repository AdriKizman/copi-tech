// src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');

/**
 * Verifica el JWT del header Authorization.
 * Si es válido, adjunta los datos del usuario en req.usuario.
 */
const verificarToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload; // { id, email, rol }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

/**
 * Restringe acceso por rol. Uso: soloAdmin
 */
const soloAdmin = (req, res, next) => {
  if (req.usuario?.rol !== 'admin') {
    return res.status(403).json({ error: 'Requiere rol administrador' });
  }
  next();
};

module.exports = { verificarToken, soloAdmin };