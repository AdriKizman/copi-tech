const Cliente = require('../models/cliente.model');
const Contrato = require('../models/contrato.model');
const Orden = require('../models/orden.model');
const ProyectoWeb = require('../models/proyectoWeb.model');
const TasaCambio = require('../models/tasaCambio.model');
const pool = require('../config/db');

const TIPOS_TRABAJO = ['Reparación', 'Proyecto web', 'Servicio general'];
const ESTADOS = ['Enviado', 'Aceptado', 'Cancelado'];
const fechaCaracas = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
const fechaValida = (valor) =>
  typeof valor === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(valor) &&
  !Number.isNaN(Date.parse(`${valor}T00:00:00Z`)) &&
  new Date(`${valor}T00:00:00Z`).toISOString().slice(0, 10) === valor;
const textoValido = (valor, maximo, obligatorio = false) =>
  typeof valor === 'string' &&
  (!obligatorio || Boolean(valor.trim())) &&
  valor.length <= maximo;
const numeroPositivo = (valor) =>
  valor !== '' && valor !== null && valor !== undefined &&
  Number.isFinite(Number(valor)) && Number(valor) > 0;
const tieneDosDecimales = (valor) =>
  Number.isFinite(Number(valor)) &&
  Math.abs(Number(valor) * 100 - Math.round(Number(valor) * 100)) < 0.000001;
const parsearIdOpcional = (valor) => {
  if (valor === undefined || valor === null || valor === '') return null;
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : NaN;
};

const listar = async (req, res) => {
  res.json({ contratos: await Contrato.listar() });
};

const ver = async (req, res) => {
  const contrato = await Contrato.buscarPorId(req.params.id);
  if (!contrato) return res.status(404).json({ error: 'Contrato no encontrado' });
  res.json(contrato);
};

const crear = async (req, res) => {
  const {
    cliente_id,
    orden_id,
    proyecto_web_id,
    solicitud_id,
    tipo_trabajo,
    titulo,
    alcance,
    condiciones,
    garantia_condiciones,
    fecha_entrega,
    monto_total_usd,
    prestador_nombre,
    prestador_identificacion,
    prestador_direccion,
    prestador_telefono,
    prestador_email,
  } = req.body;
  const clienteId = parsearIdOpcional(cliente_id);
  const ordenId = parsearIdOpcional(orden_id);
  const proyectoId = parsearIdOpcional(proyecto_web_id);
  const solicitudId = parsearIdOpcional(solicitud_id);

  if (!clienteId || Number.isNaN(clienteId)) {
    return res.status(400).json({ error: 'Selecciona un cliente registrado' });
  }
  if (!TIPOS_TRABAJO.includes(tipo_trabajo)) {
    return res.status(400).json({ error: 'Selecciona un tipo de trabajo válido' });
  }
  if (!textoValido(titulo, 160, true) || !textoValido(alcance, 8000, true)) {
    return res.status(400).json({ error: 'El título y el alcance son obligatorios; el alcance no debe superar 8000 caracteres' });
  }
  if (!textoValido(condiciones, 8000, true)) {
    return res.status(400).json({ error: 'Las condiciones son obligatorias y no deben superar 8000 caracteres' });
  }
  if (!textoValido(prestador_nombre, 150, true)) {
    return res.status(400).json({ error: 'El nombre del técnico o programador responsable es obligatorio' });
  }
  if (
    (prestador_identificacion !== undefined && !textoValido(prestador_identificacion, 80)) ||
    (prestador_direccion !== undefined && !textoValido(prestador_direccion, 255)) ||
    (prestador_telefono !== undefined && !textoValido(prestador_telefono, 30)) ||
    (prestador_email !== undefined && !textoValido(prestador_email, 150)) ||
    (garantia_condiciones !== undefined && !textoValido(garantia_condiciones, 3000))
  ) {
    return res.status(400).json({ error: 'Uno o más datos del contrato superan el límite permitido' });
  }
  if (!numeroPositivo(monto_total_usd) || !tieneDosDecimales(monto_total_usd) || Number(monto_total_usd) > 9999999999.99) {
    return res.status(400).json({ error: 'El monto acordado en USD debe ser mayor que cero' });
  }
  if (fecha_entrega && !fechaValida(fecha_entrega)) {
    return res.status(400).json({ error: 'La fecha estimada de entrega no es válida' });
  }
  if ([ordenId, proyectoId, solicitudId].some(Number.isNaN)) {
    return res.status(400).json({ error: 'La orden, el proyecto o la solicitud seleccionados no son válidos' });
  }

  const cliente = await Cliente.buscarPorId(clienteId);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

  if (tipo_trabajo === 'Reparación') {
    if (!ordenId || proyectoId) {
      return res.status(400).json({ error: 'Un contrato de reparación debe estar asociado a una orden y no a un proyecto web' });
    }
    const orden = await Orden.buscarPorId(ordenId);
    if (!orden || Number(orden.cliente_id) !== clienteId) {
      return res.status(400).json({ error: 'La orden seleccionada no pertenece a este cliente' });
    }
    if (!orden.tracking_token) await Orden.renovarTokenSeguimiento(ordenId);
  } else if (tipo_trabajo === 'Proyecto web') {
    if (!proyectoId || ordenId) {
      return res.status(400).json({ error: 'Un contrato de proyecto web debe asociarse a un proyecto y no a una orden de reparación' });
    }
    const proyecto = await ProyectoWeb.buscarPorId(proyectoId);
    if (!proyecto || Number(proyecto.cliente_id) !== clienteId) {
      return res.status(400).json({ error: 'El proyecto seleccionado no pertenece a este cliente' });
    }
  } else if (ordenId || proyectoId) {
    return res.status(400).json({ error: 'Un servicio general no puede vincularse a una orden de reparación o proyecto web' });
  }

  if (solicitudId) {
    const [solicitudes] = await pool.query(
      `SELECT id FROM solicitudes_servicio
       WHERE id = ? AND cliente_id = ? AND estado = 'Aceptada'`,
      [solicitudId, clienteId]
    );
    if (!solicitudes.length) {
      return res.status(400).json({ error: 'La solicitud debe estar aceptada y vinculada al cliente seleccionado' });
    }
  }

  const contrato = await Contrato.crear({
    cliente_id: clienteId,
    orden_id: ordenId,
    proyecto_web_id: proyectoId,
    solicitud_id: solicitudId,
    tipo_trabajo,
    titulo: titulo.trim(),
    alcance: alcance.trim(),
    condiciones: condiciones.trim(),
    garantia_condiciones: garantia_condiciones?.trim() || null,
    fecha_entrega: fecha_entrega || null,
    monto_total_usd: Number(monto_total_usd).toFixed(2),
    prestador_nombre: prestador_nombre.trim(),
    prestador_identificacion: prestador_identificacion?.trim() || null,
    prestador_direccion: prestador_direccion?.trim() || null,
    prestador_telefono: prestador_telefono?.trim() || null,
    prestador_email: prestador_email?.trim() || null,
  });
  res.status(201).json(contrato);
};

const cambiarEstado = async (req, res) => {
  const { estado } = req.body;
  if (!ESTADOS.includes(estado)) {
    return res.status(400).json({ error: 'El estado solicitado no es válido' });
  }
  const contrato = await Contrato.buscarPorId(req.params.id);
  if (!contrato) return res.status(404).json({ error: 'Contrato no encontrado' });
  if (contrato.estado === 'Cancelado' || contrato.estado === 'Aceptado') {
    return res.status(409).json({ error: 'Un contrato aceptado o cancelado no puede cambiar de estado' });
  }
  if (estado === 'Cancelado' && contrato.total_pagado_usd > 0) {
    return res.status(409).json({ error: 'No se puede cancelar un contrato con pagos registrados. Registra primero la devolución o conciliación correspondiente.' });
  }
  res.json(await Contrato.cambiarEstado(req.params.id, estado));
};

const registrarPago = async (req, res) => {
  const { moneda, tasa_usd_ves, metodo, referencia, fecha_pago } = req.body;
  const montoRecibido = req.body.monto;
  const fechaPago = fecha_pago || fechaCaracas();
  if (!numeroPositivo(montoRecibido) || !tieneDosDecimales(montoRecibido) || Number(montoRecibido) > 999999999999.99) {
    return res.status(400).json({ error: 'El monto del pago debe ser mayor que cero' });
  }
  if (!['USD', 'VES'].includes(moneda)) {
    return res.status(400).json({ error: 'Selecciona USD o VES como moneda recibida' });
  }
  if (!textoValido(metodo, 60, true)) {
    return res.status(400).json({ error: 'Indica el método de pago' });
  }
  if (referencia !== undefined && !textoValido(referencia, 120)) {
    return res.status(400).json({ error: 'La referencia no debe superar 120 caracteres' });
  }
  if (!fechaValida(fechaPago) || fechaPago > fechaCaracas()) {
    return res.status(400).json({ error: 'La fecha de pago no es válida o está en el futuro' });
  }

  let tasa = null;
  if (moneda === 'VES') {
    if (tasa_usd_ves !== undefined && tasa_usd_ves !== '') {
      if (!numeroPositivo(tasa_usd_ves) || Number(tasa_usd_ves) > 999999999999.999) {
        return res.status(400).json({ error: 'La tasa aplicada debe ser un número mayor que cero' });
      }
      tasa = Number(tasa_usd_ves);
    } else {
      const tasaRegistrada = await TasaCambio.obtenerActual(fechaPago);
      tasa = tasaRegistrada ? Number(tasaRegistrada.usd_ves) : null;
    }
    if (!tasa || !Number.isFinite(tasa)) {
      return res.status(400).json({ error: `Registra la tasa BCV de ${fechaPago} o introduce la tasa aplicada al pago` });
    }
  }

  const monto = Number(Number(montoRecibido).toFixed(2));
  const equivalenteUsd = Number(
    (moneda === 'USD' ? monto : monto / tasa).toFixed(4)
  );
  const pago = await Contrato.registrarPago(req.params.id, {
    monto: monto.toFixed(2),
    moneda,
    tasa_usd_ves: tasa,
    equivalente_usd: equivalenteUsd.toFixed(4),
    metodo: metodo.trim(),
    referencia: referencia?.trim() || null,
    fecha_pago: fechaPago,
  });
  res.status(201).json(pago);
};

const verPublico = async (req, res) => {
  if (!/^[a-f0-9]{64}$/.test(req.params.token)) {
    return res.status(404).json({ error: 'Contrato no encontrado' });
  }
  const contrato = await Contrato.buscarPublico(req.params.token);
  if (!contrato) return res.status(404).json({ error: 'Contrato no encontrado' });
  res.set('Cache-Control', 'no-store');
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.set('Referrer-Policy', 'no-referrer');
  res.json(contrato);
};

module.exports = { listar, ver, crear, cambiarEstado, registrarPago, verPublico };
