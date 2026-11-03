// src/middlewares/error.middleware.js

/**
 * Envuelve controladores async para capturar errores automáticamente.
 * Uso: router.get('/', asyncHandler(async (req,res) => {...}))
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Middleware final de errores (se registra en app.js al final).
 */
const errorHandler = (err, req, res, next) => {
  console.error('💥 Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
  });
};

module.exports = { asyncHandler, errorHandler };