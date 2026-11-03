// src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path'); // 1. Importar path para manejar rutas de carpetas
const { asyncHandler, errorHandler } = require('./middlewares/error.middleware');
const { crearSolicitud } = require('./controllers/contacto.controller');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API Mi Negocio funcionando 🚀' });
});

// --- Rutas de la API ---
app.use('/api/auth', require('./routes/auth.routes'));
app.post('/api/contacto', asyncHandler(crearSolicitud));
app.use('/api/solicitudes', require('./routes/solicitudes.routes'));
app.use('/api/proyectos-web', require('./routes/proyectosWeb.routes'));
app.use('/api/contratos', require('./routes/contratos.routes'));
app.use('/api/tasa-cambio', require('./routes/tasaCambio.routes'));
app.use('/api/clientes', require('./routes/clientes.routes'));
app.use('/api/ordenes', require('./routes/ordenes.routes'));

// --- 2. Servir los archivos estáticos del Frontend ---
// Sube un nivel desde 'src' para entrar a 'frontend-copitech'
app.use(express.static(path.join(__dirname, '../frontend-copitech')));

// --- 3. Ruta comodín para el Frontend (SPA / Navegación) ---
// Cualquier ruta que no sea de la API devolverá el index.html de tu frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend-copitech/index.html'));
});

// --- Manejo de errores (SIEMPRE al final) ---
app.use(errorHandler);

module.exports = app;