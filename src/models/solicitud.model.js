const pool = require('../config/db');

const Solicitud = {
  async crear({ nombre, telefono, email, servicio, mensaje }) {
    const [result] = await pool.query(
      `INSERT INTO solicitudes_servicio
       (nombre, telefono, email, servicio, mensaje)
       VALUES (?, ?, ?, ?, ?)`,
      [nombre, telefono, email || null, servicio, mensaje]
    );
    return result.insertId;
  },

  async listar({ limit = 20, offset = 0 }) {
    const [conteo] = await pool.query(
      'SELECT COUNT(*) AS total FROM solicitudes_servicio'
    );
    const [solicitudes] = await pool.query(
      `SELECT s.*, c.nombre AS cliente_nombre
       FROM solicitudes_servicio s
       LEFT JOIN clientes c ON c.id = s.cliente_id
       ORDER BY s.creada_en DESC
       LIMIT ? OFFSET ?`,
      [Number(limit), Number(offset)]
    );

    return { solicitudes, total: Number(conteo[0].total) };
  },

  async aceptar(id) {
    const conexion = await pool.getConnection();

    try {
      await conexion.beginTransaction();

      const [solicitudes] = await conexion.query(
        'SELECT * FROM solicitudes_servicio WHERE id = ? FOR UPDATE',
        [id]
      );
      const solicitud = solicitudes[0];
      if (!solicitud) {
        const error = new Error('Solicitud no encontrada');
        error.status = 404;
        throw error;
      }

      let clienteId = solicitud.cliente_id;

      if (solicitud.estado !== 'Aceptada') {
        if (!clienteId) {
          const [clientes] = await conexion.query(
            'SELECT id FROM clientes WHERE telefono = ? ORDER BY id LIMIT 1',
            [solicitud.telefono]
          );
          clienteId = clientes[0]?.id;
        }

        if (!clienteId) {
          const notas = `Solicitud web - ${solicitud.servicio}\n${solicitud.mensaje}`;
          const [clienteCreado] = await conexion.query(
            `INSERT INTO clientes (nombre, telefono, email, direccion, notas)
             VALUES (?, ?, ?, ?, ?)`,
            [solicitud.nombre, solicitud.telefono, solicitud.email, null, notas]
          );
          clienteId = clienteCreado.insertId;
        }

        await conexion.query(
          `UPDATE solicitudes_servicio
           SET estado = 'Aceptada', cliente_id = ?, aceptada_en = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [clienteId, id]
        );
      }

      await conexion.commit();

      const [actualizadas] = await pool.query(
        `SELECT s.*, c.nombre AS cliente_nombre
         FROM solicitudes_servicio s
         LEFT JOIN clientes c ON c.id = s.cliente_id
         WHERE s.id = ?`,
        [id]
      );
      return actualizadas[0];
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  },
};

module.exports = Solicitud;
