// src/controllers/ordenes.controller.js
const Orden = require('../models/orden.model');

const ESTADOS_VALIDOS = ['Recibido', 'En Diagnóstico', 'Esperando Repuesto', 'Listo', 'Entregado'];

const parsearEntero = (valor, predeterminado) => {
  const numero = Number.parseInt(valor, 10);
  return Number.isInteger(numero) ? numero : predeterminado;
};

const esFechaValida = (valor) =>
  typeof valor === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(valor) &&
  !Number.isNaN(Date.parse(`${valor}T00:00:00Z`)) &&
  new Date(`${valor}T00:00:00Z`).toISOString().slice(0, 10) === valor;

const listar = async (req, res) => {
  const { estado, cliente_id } = req.query;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const limit = Math.min(Math.max(parsearEntero(req.query.limit, 20), 1), 100);
  const page = Math.max(parsearEntero(req.query.page, 1), 1);
  const offset = req.query.offset === undefined
    ? (page - 1) * limit
    : Math.max(parsearEntero(req.query.offset, 0), 0);

  if (estado && !ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  if (search.length > 150) {
    return res.status(400).json({ error: 'El término de búsqueda es demasiado largo' });
  }

  const resultado = await Orden.listar({
    estado,
    cliente_id,
    search,
    limit,
    offset,
  });
  res.json({
    ...resultado,
    page: Math.floor(offset / limit) + 1,
    limit,
    pages: Math.ceil(resultado.total / limit),
  });
};

const ver = async (req, res) => {
  const orden = await Orden.buscarPorId(req.params.id);
  if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });
  res.json(orden);
};

const crear = async (req, res) => {
  const {
    cliente_id,
    cliente,
    equipo_marca,
    equipo_modelo,
    tipo_equipo,
    falla_reportada,
    numero_serie,
    condicion_recepcion,
    accesorios_recepcion,
    observaciones_recepcion,
    diagnostico,
    notas,
    presupuesto,
  } = req.body;

  const clienteId = Number(cliente_id);
  const clienteIdValido =
    (typeof cliente_id === 'number' ||
      (typeof cliente_id === 'string' && /^\d+$/.test(cliente_id))) &&
    Number.isSafeInteger(clienteId) &&
    clienteId > 0;
  const nuevoClienteValido =
    cliente &&
    typeof cliente === 'object' &&
    typeof cliente.nombre === 'string' &&
    typeof cliente.telefono === 'string' &&
    cliente.nombre.trim() &&
    cliente.telefono.trim();

  if ((!clienteIdValido && !nuevoClienteValido) || (clienteIdValido && nuevoClienteValido)) {
    return res.status(400).json({
      error: 'Selecciona un cliente registrado o proporciona los datos para registrar uno nuevo',
    });
  }

  if (
    typeof equipo_marca !== 'string' ||
    typeof equipo_modelo !== 'string' ||
    typeof falla_reportada !== 'string' ||
    !equipo_marca.trim() ||
    !equipo_modelo.trim() ||
    !falla_reportada.trim()
  ) {
    return res.status(400).json({
      error: 'Marca, modelo y falla reportada son obligatorios',
    });
  }
  if (
    equipo_marca.trim().length > 100 ||
    equipo_modelo.trim().length > 150 ||
    (tipo_equipo !== undefined && (typeof tipo_equipo !== 'string' || tipo_equipo.length > 50)) ||
    falla_reportada.trim().length > 2000 ||
    (numero_serie !== undefined && (typeof numero_serie !== 'string' || numero_serie.length > 150)) ||
    (condicion_recepcion !== undefined && (typeof condicion_recepcion !== 'string' || condicion_recepcion.length > 1000)) ||
    (accesorios_recepcion !== undefined && (typeof accesorios_recepcion !== 'string' || accesorios_recepcion.length > 1000)) ||
    (observaciones_recepcion !== undefined && (typeof observaciones_recepcion !== 'string' || observaciones_recepcion.length > 2000)) ||
    (diagnostico !== undefined && (typeof diagnostico !== 'string' || diagnostico.length > 5000)) ||
    (notas !== undefined && (typeof notas !== 'string' || notas.length > 5000))
  ) {
    return res.status(400).json({ error: 'Uno o más campos superan el límite permitido' });
  }
  if (
    presupuesto !== undefined &&
    presupuesto !== null &&
    (presupuesto === '' || !Number.isFinite(Number(presupuesto)) || Number(presupuesto) < 0)
  ) {
    return res.status(400).json({ error: 'El presupuesto debe ser un valor igual o mayor a cero' });
  }
  if (
    nuevoClienteValido &&
    (
      cliente.nombre.trim().length > 100 ||
      cliente.telefono.trim().length > 30 ||
      (cliente.email !== undefined && (typeof cliente.email !== 'string' || cliente.email.length > 150)) ||
      (cliente.direccion !== undefined && (typeof cliente.direccion !== 'string' || cliente.direccion.length > 250))
    )
  ) {
    return res.status(400).json({ error: 'Los datos del cliente superan el límite permitido' });
  }

  const resultado = await Orden.crearRecepcion(
    {
      ...req.body,
      cliente_id: clienteIdValido ? clienteId : null,
      equipo_marca: equipo_marca.trim(),
      equipo_modelo: equipo_modelo.trim(),
      tipo_equipo: tipo_equipo?.trim() || null,
      falla_reportada: falla_reportada.trim(),
      condicion_recepcion: condicion_recepcion?.trim() || null,
      accesorios_recepcion: accesorios_recepcion?.trim() || null,
      observaciones_recepcion: observaciones_recepcion?.trim() || null,
      numero_serie: numero_serie?.trim() || null,
      diagnostico: diagnostico?.trim() || null,
      notas: notas?.trim() || null,
      presupuesto: presupuesto === '' || presupuesto === undefined ? null : presupuesto,
      tecnico_id: req.usuario.id,
    },
    nuevoClienteValido
      ? {
          nombre: cliente.nombre.trim(),
          telefono: cliente.telefono.trim(),
          email: cliente.email?.trim() || null,
          direccion: cliente.direccion?.trim() || null,
        }
      : null
  );
  res.status(201).json({
    ...resultado.orden,
    cliente_reutilizado: resultado.cliente_reutilizado,
  });
};

const actualizar = async (req, res) => {
  const existe = await Orden.buscarPorId(req.params.id);
  if (!existe) return res.status(404).json({ error: 'Orden no encontrada' });

  for (const campo of [
    'diagnostico',
    'notas',
    'falla_reportada',
    'tipo_equipo',
    'condicion_recepcion',
    'accesorios_recepcion',
    'observaciones_recepcion',
  ]) {
    if (req.body[campo] !== undefined && typeof req.body[campo] !== 'string') {
      return res.status(400).json({ error: `${campo} debe ser texto` });
    }
  }
  if (
    req.body.diagnostico?.length > 5000 ||
    req.body.notas?.length > 5000 ||
    req.body.tipo_equipo?.length > 50 ||
    req.body.condicion_recepcion?.length > 1000 ||
    req.body.accesorios_recepcion?.length > 1000 ||
    req.body.observaciones_recepcion?.length > 2000
  ) {
    return res.status(400).json({ error: 'El diagnóstico o las notas superan el límite permitido' });
  }
  if (
    req.body.presupuesto !== undefined &&
    req.body.presupuesto !== null &&
    (req.body.presupuesto === '' ||
      !Number.isFinite(Number(req.body.presupuesto)) ||
      Number(req.body.presupuesto) < 0)
  ) {
    return res.status(400).json({ error: 'El presupuesto debe ser un valor positivo' });
  }

  const actualizada = await Orden.actualizar(req.params.id, req.body);
  res.json(actualizada);
};

/**
 * PATCH /api/ordenes/:id/estado
 * Cambio rápido de estado (ideal para móvil: un solo campo).
 */
const cambiarEstado = async (req, res) => {
  const { estado } = req.body;
  if (!ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({
      error: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}`,
    });
  }

  const existe = await Orden.buscarPorId(req.params.id);
  if (!existe) return res.status(404).json({ error: 'Orden no encontrada' });

  const actualizada = await Orden.cambiarEstado(req.params.id, estado);
  res.json(actualizada);
};

/**
 * GET /api/ordenes/seguimiento/:token (PÚBLICO)
 * El cliente consulta el estado usando su enlace privado.
 */
const seguimiento = async (req, res) => {
  if (!/^[a-f0-9]{64}$/.test(req.params.token)) {
    return res.status(404).json({ error: 'Enlace de seguimiento no encontrado' });
  }
  const orden = await Orden.buscarPorTokenSeguimiento(req.params.token);
  if (!orden) return res.status(404).json({ error: 'Enlace de seguimiento no encontrado' });
  res.set('Cache-Control', 'no-store');
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.set('Referrer-Policy', 'no-referrer');
  res.json(orden);
};

const renovarTokenSeguimiento = async (req, res) => {
  const orden = await Orden.buscarPorId(req.params.id);
  if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });
  res.json(await Orden.renovarTokenSeguimiento(req.params.id));
};

const eliminar = async (req, res) => {
  const ok = await Orden.eliminar(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Orden no encontrada' });
  res.json({ message: 'Orden eliminada' });
};

const estadisticas = async (req, res) => {
  const stats = await Orden.obtenerEstadisticas();
  res.json(stats);
};

const recordatorios = async (req, res) => {
  const dias = parsearEntero(req.query.dias, 7);
  if (dias < 1 || dias > 365) {
    return res.status(400).json({ error: 'El período debe estar entre 1 y 365 días' });
  }

  const resultado = await Orden.obtenerRecordatorios(dias);
  res.json({ dias, ...resultado });
};

const informe = async (req, res) => {
  const hoy = new Date().toISOString().slice(0, 10);
  const fechaPredeterminada = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const desde = req.query.desde || fechaPredeterminada;
  const hasta = req.query.hasta || hoy;

  if (!esFechaValida(desde) || !esFechaValida(hasta) || desde > hasta) {
    return res.status(400).json({ error: 'El rango de fechas no es válido' });
  }

  const resultado = await Orden.obtenerInforme({ desde, hasta });
  res.json({ desde, hasta, ...resultado });
};

module.exports = {
  listar,
  ver,
  crear,
  actualizar,
  cambiarEstado,
  seguimiento,
  renovarTokenSeguimiento,
  eliminar,
  estadisticas,
  recordatorios,
  informe,
};