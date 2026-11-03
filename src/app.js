// src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const { asyncHandler, errorHandler } = require('./middlewares/error.middleware');
const { crearSolicitud } = require('./controllers/contacto.controller');

const app = express();
const frontendDist = path.join(__dirname, '../frontend-copitech/dist');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API Mi Negocio funcionando 🚀' });
});

// --- Rutas ---
app.use('/api/auth', require('./routes/auth.routes'));
app.post('/api/contacto', asyncHandler(crearSolicitud));
app.use('/api/solicitudes', require('./routes/solicitudes.routes'));
app.use('/api/proyectos-web', require('./routes/proyectosWeb.routes'));
app.use('/api/contratos', require('./routes/contratos.routes'));
app.use('/api/tasa-cambio', require('./routes/tasaCambio.routes'));
app.use('/api/clientes', require('./routes/clientes.routes'));
app.use('/api/ordenes', require('./routes/ordenes.routes'));

// --- Frontend de producción ---
app.use(express.static(frontendDist));
app.use((req, res, next) => {
  if (
    req.method !== 'GET' ||
    req.path === '/api' ||
    req.path.startsWith('/api/')
  ) {
    return next();
  }

  res.sendFile(path.join(frontendDist, 'index.html'), (error) => {
    if (error) next(error);
  });
});

// --- 404 ---
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// --- Manejo de errores (SIEMPRE al final) ---
app.use(errorHandler);

module.exports = app;