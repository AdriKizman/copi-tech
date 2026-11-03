// src/controllers/clientes.controller.js
const Cliente = require('../models/cliente.model');
const Orden = require('../models/orden.model');

const parsearEntero = (valor, predeterminado) => {
  const numero = Number.parseInt(valor, 10);
  return Number.isInteger(numero) ? numero : predeterminado;
};

const listar = async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  if (search.length > 150) {
    return res.status(400).json({ error: 'El término de búsqueda es demasiado largo' });
  }

  const limit = Math.min(Math.max(parsearEntero(req.query.limit, 20), 1), 100);
  const page = Math.max(parsearEntero(req.query.page, 1), 1);
  const offset = req.query.offset === undefined
    ? (page - 1) * limit
    : Math.max(parsearEntero(req.query.offset, 0), 0);
  const resultado = await Cliente.listar({ search, limit, offset });
  res.json({
    ...resultado,
    page: Math.floor(offset / limit) + 1,
    limit,
    pages: Math.ceil(resultado.total / limit),
  });
};

const historial = async (req, res) => {
  const cliente = await Cliente.buscarPorId(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

  const limit = Math.min(Math.max(parsearEntero(req.query.limit, 20), 1), 100);
  const page = Math.max(parsearEntero(req.query.page, 1), 1);
  const resultado = await Orden.listar({
    cliente_id: req.params.id,
    limit,
    offset: (page - 1) * limit,
  });

  res.json({
    cliente,
    ...resultado,
    page,
    limit,
    pages: Math.ceil(resultado.total / limit),
  });
};

const ver = async (req, res) => {
  const cliente = await Cliente.buscarPorId(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(cliente);
};

const crear = async (req, res) => {
  const { nombre, telefono } = req.body;
  if (!nombre || !telefono) {
    return res.status(400).json({ error: 'nombre y telefono son obligatorios' });
  }
  const cliente = await Cliente.crear(req.body);
  res.status(201).json(cliente);
};

const actualizar = async (req, res) => {
  const existe = await Cliente.buscarPorId(req.params.id);
  if (!existe) return res.status(404).json({ error: 'Cliente no encontrado' });

  const actualizado = await Cliente.actualizar(req.params.id, req.body);
  res.json(actualizado);
};

const eliminar = async (req, res) => {
  try {
    const ok = await Cliente.eliminar(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ message: 'Cliente eliminado' });
  } catch (err) {
    // Error típico si tiene órdenes asociadas (FK RESTRICT)
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        error: 'No se puede eliminar: el cliente tiene órdenes asociadas',
      });
    }
    throw err;
  }
};

module.exports = { listar, ver, historial, crear, actualizar, eliminar };