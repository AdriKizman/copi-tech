const TasaCambio = require('../models/tasaCambio.model');

function fechaCaracas() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const partesPorTipo = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${partesPorTipo.year}-${partesPorTipo.month}-${partesPorTipo.day}`;
}

function esFechaValida(fecha) {
  return typeof fecha === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(fecha) &&
    !Number.isNaN(Date.parse(`${fecha}T00:00:00Z`)) &&
    new Date(`${fecha}T00:00:00Z`).toISOString().slice(0, 10) === fecha;
}

const obtenerActual = async (req, res) => {
  const tasa = await TasaCambio.obtenerActual(fechaCaracas());
  res.json({ tasa });
};

const listarHistorial = async (req, res) => {
  const historial = await TasaCambio.listarHistorial();
  res.json({ historial });
};

const guardar = async (req, res) => {
  const { fecha, usd_ves: usdVes } = req.body;
  const numero = Number(usdVes);

  if (!esFechaValida(fecha) || fecha !== fechaCaracas()) {
    return res.status(400).json({ error: 'La tasa solo se puede registrar para la fecha actual de Venezuela' });
  }
  if (
    usdVes === '' ||
    !Number.isFinite(numero) ||
    numero <= 0 ||
    numero > 999999999999
  ) {
    return res.status(400).json({ error: 'La tasa debe ser un número mayor que cero' });
  }

  const tasa = await TasaCambio.guardar(fecha, numero);
  res.json({ tasa });
};

module.exports = { obtenerActual, listarHistorial, guardar };
