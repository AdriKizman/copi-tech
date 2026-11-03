const Solicitud = require('../models/solicitud.model');

const crearSolicitud = async (req, res) => {
  const { nombre, telefono, email, servicio, mensaje, website } = req.body;

  if (website) {
    return res.status(201).json({ message: 'Solicitud recibida' });
  }

  if (
    typeof nombre !== 'string' ||
    typeof telefono !== 'string' ||
    typeof servicio !== 'string' ||
    typeof mensaje !== 'string' ||
    !nombre.trim() ||
    !telefono.trim() ||
    !servicio.trim() ||
    !mensaje.trim()
  ) {
    return res.status(400).json({ error: 'Completa los campos obligatorios' });
  }

  if (
    nombre.trim().length > 100 ||
    telefono.trim().length > 30 ||
    (email !== undefined && (typeof email !== 'string' || email.length > 150)) ||
    servicio.trim().length > 80 ||
    mensaje.trim().length > 2000
  ) {
    return res.status(400).json({ error: 'Uno o más campos superan el límite permitido' });
  }

  await Solicitud.crear({
    nombre: nombre.trim(),
    telefono: telefono.trim(),
    email: typeof email === 'string' && email.trim() ? email.trim() : null,
    servicio: servicio.trim(),
    mensaje: mensaje.trim(),
  });

  res.status(201).json({ message: 'Solicitud recibida' });
};

module.exports = { crearSolicitud };
