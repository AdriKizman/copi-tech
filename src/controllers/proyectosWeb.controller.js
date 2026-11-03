const Cliente = require('../models/cliente.model');
const ProyectoWeb = require('../models/proyectoWeb.model');
const QRCode = require('qrcode');

const ESTADOS_PROYECTO = [
  'Planificación',
  'En desarrollo',
  'En revisión',
  'Completado',
  'Pausado',
];
const ESTADOS_TAREA = ['Pendiente', 'En progreso', 'Completada'];
const esFechaValida = (valor) =>
  typeof valor === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(valor) &&
  !Number.isNaN(Date.parse(`${valor}T00:00:00Z`)) &&
  new Date(`${valor}T00:00:00Z`).toISOString().slice(0, 10) === valor;

const listar = async (req, res) => {
  res.json({ proyectos: await ProyectoWeb.listar() });
};

const crear = async (req, res) => {
  const { cliente_id, nombre, descripcion_cliente, fecha_entrega } = req.body;
  const clienteId = Number(cliente_id);
  if (
    !Number.isSafeInteger(clienteId) ||
    clienteId < 1 ||
    (typeof cliente_id !== 'number' && typeof cliente_id !== 'string')
  ) {
    return res.status(400).json({ error: 'Selecciona un cliente registrado' });
  }
  if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 150) {
    return res.status(400).json({ error: 'El nombre del proyecto es obligatorio y no debe superar 150 caracteres' });
  }
  if (
    descripcion_cliente !== undefined &&
    (typeof descripcion_cliente !== 'string' || descripcion_cliente.length > 3000)
  ) {
    return res.status(400).json({ error: 'La descripción no debe superar 3000 caracteres' });
  }
  if (fecha_entrega !== undefined && fecha_entrega !== null && fecha_entrega !== '' && !esFechaValida(fecha_entrega)) {
    return res.status(400).json({ error: 'La fecha de entrega no es válida' });
  }

  const cliente = await Cliente.buscarPorId(clienteId);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

  const proyecto = await ProyectoWeb.crear({
    cliente_id: clienteId,
    nombre: nombre.trim(),
    descripcion_cliente: descripcion_cliente?.trim() || null,
    fecha_entrega: fecha_entrega || null,
  });
  res.status(201).json(proyecto);
};

const cambiarEstado = async (req, res) => {
  const { estado } = req.body;
  if (!ESTADOS_PROYECTO.includes(estado)) {
    return res.status(400).json({ error: 'El estado del proyecto no es válido' });
  }
  const proyecto = await ProyectoWeb.buscarPorId(req.params.id);
  if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });
  res.json(await ProyectoWeb.cambiarEstado(req.params.id, estado));
};

const renovarEnlace = async (req, res) => {
  const proyecto = await ProyectoWeb.buscarPorId(req.params.id);
  if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });
  res.json(await ProyectoWeb.renovarEnlace(req.params.id));
};

const crearTarea = async (req, res) => {
  const { titulo, visible_cliente = true } = req.body;
  if (typeof titulo !== 'string' || !titulo.trim() || titulo.trim().length > 160) {
    return res.status(400).json({ error: 'El nombre de la tarea es obligatorio y no debe superar 160 caracteres' });
  }
  if (typeof visible_cliente !== 'boolean') {
    return res.status(400).json({ error: 'La visibilidad para el cliente debe ser verdadera o falsa' });
  }

  const proyecto = await ProyectoWeb.buscarPorId(req.params.id);
  if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });
  const tarea = await ProyectoWeb.crearTarea(req.params.id, {
    titulo: titulo.trim(),
    visible_cliente,
  });
  res.status(201).json(tarea);
};

const cambiarEstadoTarea = async (req, res) => {
  const { estado } = req.body;
  if (!ESTADOS_TAREA.includes(estado)) {
    return res.status(400).json({ error: 'El estado de la tarea no es válido' });
  }
  const tarea = await ProyectoWeb.cambiarEstadoTarea(
    req.params.proyectoId,
    req.params.tareaId,
    estado
  );
  if (!tarea) return res.status(404).json({ error: 'Tarea o proyecto no encontrado' });
  res.json(tarea);
};

const verPublico = async (req, res) => {
  if (!/^[a-f0-9]{64}$/.test(req.params.token)) {
    return res.status(404).json({ error: 'Enlace de proyecto no encontrado' });
  }
  const proyecto = await ProyectoWeb.buscarPorToken(req.params.token);
  if (!proyecto) return res.status(404).json({ error: 'Enlace de proyecto no encontrado' });
  res.set('Cache-Control', 'no-store');
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.set('Referrer-Policy', 'no-referrer');
  res.json(proyecto);
};

const generarQR = async (req, res) => {
  const { token } = req.params;
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return res.status(404).json({ error: 'Enlace de proyecto no encontrado' });
  }
  const proyecto = await ProyectoWeb.buscarPorToken(token);
  if (!proyecto) return res.status(404).json({ error: 'Enlace de proyecto no encontrado' });

  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const urlSeguimiento = `${frontendUrl}/proyecto/${encodeURIComponent(token)}`;
  const imagen = await QRCode.toBuffer(urlSeguimiento, {
    type: 'png',
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });

  res.set('Cache-Control', 'no-store');
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.set('Referrer-Policy', 'no-referrer');
  res.type('png').send(imagen);
};

module.exports = {
  listar,
  crear,
  cambiarEstado,
  renovarEnlace,
  crearTarea,
  cambiarEstadoTarea,
  verPublico,
  generarQR,
};
