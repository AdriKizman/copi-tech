const Solicitud = require('../models/solicitud.model');

const parsearEntero = (valor, predeterminado) => {
  const numero = Number.parseInt(valor, 10);
  return Number.isInteger(numero) ? numero : predeterminado;
};

const listar = async (req, res) => {
  const limit = Math.min(Math.max(parsearEntero(req.query.limit, 20), 1), 100);
  const page = Math.max(parsearEntero(req.query.page, 1), 1);
  const offset = (page - 1) * limit;
  const resultado = await Solicitud.listar({ limit, offset });

  res.json({
    ...resultado,
    page,
    limit,
    pages: Math.ceil(resultado.total / limit),
  });
};

const aceptar = async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'El identificador de solicitud no es válido' });
  }

  const solicitud = await Solicitud.aceptar(id);
  res.json({ solicitud });
};

module.exports = { listar, aceptar };
