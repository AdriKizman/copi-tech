// src/models/orden.model.js
const crypto = require('crypto');
const pool = require('../config/db');

const Orden = {
  /**
   * Genera un código tipo REP-2025-0001 secuencial por año.
   */
  async generarCodigo() {
    return this.generarCodigoCon(pool);
  },

  async generarCodigoCon(conexion) {
    const year = new Date().getFullYear();
    const prefijo = `REP-${year}-`;

    const [rows] = await conexion.query(
      `SELECT codigo_seguimiento FROM ordenes_reparacion
       WHERE codigo_seguimiento LIKE ?
       ORDER BY id DESC LIMIT 1`,
      [`${prefijo}%`]
    );

    let secuencia = 1;
    if (rows.length > 0) {
      const ultimo = rows[0].codigo_seguimiento.split('-')[2];
      secuencia = parseInt(ultimo, 10) + 1;
    }

    return `${prefijo}${String(secuencia).padStart(4, '0')}`;
  },

  async crearRecepcion(data, nuevoCliente) {
    const conexion = await pool.getConnection();
    let clienteId = data.cliente_id;
    let clienteReutilizado = false;
    const trackingToken = crypto.randomBytes(32).toString('hex');

    try {
      await conexion.beginTransaction();

      if (nuevoCliente) {
        const [clientesExistentes] = await conexion.query(
          `SELECT id FROM clientes WHERE telefono = ? LIMIT 1`,
          [nuevoCliente.telefono]
        );

        if (clientesExistentes.length > 0) {
          clienteId = clientesExistentes[0].id;
          clienteReutilizado = true;
        } else {
          const [clienteCreado] = await conexion.query(
            `INSERT INTO clientes (nombre, telefono, email, direccion, notas)
             VALUES (?, ?, ?, ?, ?)`,
            [
              nuevoCliente.nombre,
              nuevoCliente.telefono,
              nuevoCliente.email || null,
              nuevoCliente.direccion || null,
              null,
            ]
          );
          clienteId = clienteCreado.insertId;
        }
      } else {
        const [clientes] = await conexion.query(
          `SELECT id FROM clientes WHERE id = ? LIMIT 1`,
          [clienteId]
        );
        if (clientes.length === 0) {
          const error = new Error('Cliente no existe');
          error.status = 404;
          throw error;
        }
      }

      const codigo = await this.generarCodigoCon(conexion);
      const [ordenCreada] = await conexion.query(
        `INSERT INTO ordenes_reparacion
         (codigo_seguimiento, cliente_id, tecnico_id, equipo_marca, equipo_modelo,
          tipo_equipo, numero_serie, falla_reportada, condicion_recepcion,
          accesorios_recepcion, observaciones_recepcion, diagnostico, presupuesto,
          estado, notas, tracking_token)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          codigo,
          clienteId,
          data.tecnico_id || null,
          data.equipo_marca,
          data.equipo_modelo,
          data.tipo_equipo || null,
          data.numero_serie || null,
          data.falla_reportada,
          data.condicion_recepcion || null,
          data.accesorios_recepcion || null,
          data.observaciones_recepcion || null,
          data.diagnostico || null,
          data.presupuesto ?? null,
          data.estado || 'Recibido',
          data.notas || null,
          trackingToken,
        ]
      );

      const [ordenes] = await conexion.query(
        `SELECT o.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono,
                c.email AS cliente_email, u.nombre AS tecnico_nombre
         FROM ordenes_reparacion o
         INNER JOIN clientes c ON c.id = o.cliente_id
         LEFT JOIN usuarios u ON u.id = o.tecnico_id
         WHERE o.id = ?`,
        [ordenCreada.insertId]
      );

      await conexion.commit();
      return { orden: ordenes[0], cliente_reutilizado: clienteReutilizado };
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  },

  async listar({ estado, cliente_id, search = '', limit = 50, offset = 0 }) {
    let where = `
      WHERE 1 = 1
    `;
    const params = [];

    if (estado) {
      where += ' AND o.estado = ?';
      params.push(estado);
    }
    if (cliente_id) {
      where += ' AND o.cliente_id = ?';
      params.push(cliente_id);
    }
    if (search) {
      where += ' AND (o.codigo_seguimiento LIKE ? OR o.equipo_marca LIKE ? OR o.equipo_modelo LIKE ? OR c.nombre LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    const [conteo] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM ordenes_reparacion o
       INNER JOIN clientes c ON c.id = o.cliente_id
       ${where}`,
      params
    );

    const [ordenes] = await pool.query(
      `
      SELECT o.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono,
             u.nombre AS tecnico_nombre
      FROM ordenes_reparacion o
      INNER JOIN clientes c ON c.id = o.cliente_id
      LEFT JOIN usuarios u ON u.id = o.tecnico_id
      ${where}
      ORDER BY o.fecha_ingreso DESC
      LIMIT ? OFFSET ?
      `,
      [...params, Number(limit), Number(offset)]
    );

    return { ordenes, total: Number(conteo[0].total) };
  },

  async buscarPorId(id) {
    const [rows] = await pool.query(
      `SELECT o.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono,
              c.email AS cliente_email, u.nombre AS tecnico_nombre
       FROM ordenes_reparacion o
       INNER JOIN clientes c ON c.id = o.cliente_id
       LEFT JOIN usuarios u ON u.id = o.tecnico_id
       WHERE o.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async buscarPorCodigo(codigo) {
    const [rows] = await pool.query(
      `SELECT o.codigo_seguimiento, o.equipo_marca, o.equipo_modelo,
              o.estado, o.fecha_ingreso, o.fecha_entrega, o.falla_reportada, o.diagnostico,
              o.presupuesto, c.nombre AS cliente_nombre
       FROM ordenes_reparacion o
       INNER JOIN clientes c ON c.id = o.cliente_id
       WHERE o.codigo_seguimiento = ?`,
      [codigo]
    );
    return rows[0] || null;
  },

  async buscarPorTokenSeguimiento(token) {
    const [rows] = await pool.query(
      `SELECT codigo_seguimiento, equipo_marca, equipo_modelo, estado,
              fecha_ingreso, fecha_entrega
       FROM ordenes_reparacion
       WHERE tracking_token = ?`,
      [token]
    );
    return rows[0] || null;
  },

  async renovarTokenSeguimiento(id) {
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query(
      'UPDATE ordenes_reparacion SET tracking_token = ? WHERE id = ?',
      [token, id]
    );
    return this.buscarPorId(id);
  },

  async crear(data) {
    const codigo = await this.generarCodigo();
    const trackingToken = crypto.randomBytes(32).toString('hex');
    const [result] = await pool.query(
      `INSERT INTO ordenes_reparacion
       (codigo_seguimiento, cliente_id, tecnico_id, equipo_marca, equipo_modelo,
        numero_serie, falla_reportada, diagnostico, presupuesto, estado, tracking_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo,
        data.cliente_id,
        data.tecnico_id || null,
        data.equipo_marca,
        data.equipo_modelo,
        data.numero_serie || null,
        data.falla_reportada,
        data.diagnostico || null,
        data.presupuesto || null,
        data.estado || 'Recibido',
        trackingToken,
      ]
    );
    return this.buscarPorId(result.insertId);
  },

  async actualizar(id, data) {
    const campos = [
      ['tecnico_id', data.tecnico_id],
      ['equipo_marca', data.equipo_marca],
      ['equipo_modelo', data.equipo_modelo],
      ['numero_serie', data.numero_serie],
      ['falla_reportada', data.falla_reportada],
      ['tipo_equipo', data.tipo_equipo],
      ['condicion_recepcion', data.condicion_recepcion],
      ['accesorios_recepcion', data.accesorios_recepcion],
      ['observaciones_recepcion', data.observaciones_recepcion],
      ['diagnostico', data.diagnostico],
      ['presupuesto', data.presupuesto],
      ['notas', data.notas],
    ].filter(([, valor]) => valor !== undefined);

    if (campos.length === 0) {
      return this.buscarPorId(id);
    }

    await pool.query(
      `UPDATE ordenes_reparacion
       SET ${campos.map(([campo]) => `${campo} = ?`).join(', ')}
       WHERE id = ?`,
      [...campos.map(([, valor]) => valor), id]
    );
    return this.buscarPorId(id);
  },

  async cambiarEstado(id, nuevoEstado) {
    await pool.query(
      `UPDATE ordenes_reparacion
       SET estado = ?,
           fecha_entrega = IF(? = 'Entregado', COALESCE(fecha_entrega, CURRENT_TIMESTAMP), NULL)
       WHERE id = ?`,
      [nuevoEstado, nuevoEstado, id]
    );
    return this.buscarPorId(id);
  },

  async eliminar(id) {
    const [result] = await pool.query(
      'DELETE FROM ordenes_reparacion WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  },

  async obtenerEstadisticas() {
    // 1. Contar órdenes por estado
    const [porEstado] = await pool.query(
      `SELECT estado, COUNT(*) as cantidad 
       FROM ordenes_reparacion 
       GROUP BY estado`
    );

    // 2. Calcular ingresos del mes actual (órdenes entregadas)
    const [ingresos] = await pool.query(
      `SELECT COALESCE(SUM(equivalente_usd), 0) AS total
       FROM pagos_contrato
       WHERE MONTH(fecha_pago) = MONTH(CURRENT_DATE())
         AND YEAR(fecha_pago) = YEAR(CURRENT_DATE())`
    );

    // Formatear la respuesta
    const stats = {
      Recibido: 0,
      'En Diagnóstico': 0,
      'Esperando Repuesto': 0,
      Listo: 0,
      Entregado: 0,
      ingresos_mes: Number(ingresos[0].total) || 0
    };

    // Llenar los conteos reales
    porEstado.forEach(item => {
      stats[item.estado] = item.cantidad;
    });

    return stats;
  },

  async obtenerRecordatorios(dias) {
    const [listas] = await pool.query(
      `SELECT o.id, o.codigo_seguimiento, o.equipo_marca, o.equipo_modelo,
              o.estado, o.fecha_ingreso, o.actualizado_en,
              DATEDIFF(CURRENT_DATE(), COALESCE(o.actualizado_en, o.fecha_ingreso)) AS dias_lista,
              c.nombre AS cliente_nombre, c.telefono AS cliente_telefono
       FROM ordenes_reparacion o
       INNER JOIN clientes c ON c.id = o.cliente_id
       WHERE o.estado = 'Listo'
       ORDER BY o.actualizado_en ASC`
    );

    const [atrasadas] = await pool.query(
      `SELECT o.id, o.codigo_seguimiento, o.equipo_marca, o.equipo_modelo,
              o.estado, o.fecha_ingreso, o.actualizado_en,
              DATEDIFF(CURRENT_DATE(), COALESCE(o.actualizado_en, o.fecha_ingreso)) AS dias_sin_actualizar,
              c.nombre AS cliente_nombre, c.telefono AS cliente_telefono
       FROM ordenes_reparacion o
       INNER JOIN clientes c ON c.id = o.cliente_id
       WHERE o.estado IN ('Recibido', 'En Diagnóstico', 'Esperando Repuesto')
         AND COALESCE(o.actualizado_en, o.fecha_ingreso) < DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL ? DAY)
       ORDER BY o.actualizado_en ASC, o.fecha_ingreso ASC`,
      [dias]
    );

    return { listas, atrasadas };
  },

  async obtenerInforme({ desde, hasta }) {
    const [resumen] = await pool.query(
      `SELECT COUNT(*) AS ordenes_entregadas,
              COALESCE(SUM(presupuesto), 0) AS valor_presupuestado,
              COALESCE(AVG(presupuesto), 0) AS promedio_por_orden
       FROM ordenes_reparacion
       WHERE estado = 'Entregado'
         AND fecha_entrega >= ?
         AND fecha_entrega < DATE_ADD(?, INTERVAL 1 DAY)`,
      [desde, hasta]
    );

    const [porDia] = await pool.query(
      `SELECT DATE(fecha_entrega) AS fecha,
              COUNT(*) AS ordenes_entregadas,
              COALESCE(SUM(presupuesto), 0) AS valor_presupuestado
       FROM ordenes_reparacion
       WHERE estado = 'Entregado'
         AND fecha_entrega >= ?
         AND fecha_entrega < DATE_ADD(?, INTERVAL 1 DAY)
       GROUP BY DATE(fecha_entrega)
       ORDER BY fecha ASC`,
      [desde, hasta]
    );

    const [cobrosResumen] = await pool.query(
      `SELECT COUNT(*) AS pagos_registrados,
              COUNT(DISTINCT contrato_id) AS contratos_con_pagos,
              COALESCE(SUM(equivalente_usd), 0) AS total_cobrado_usd,
              COALESCE(SUM(CASE WHEN moneda = 'USD' THEN monto ELSE 0 END), 0) AS total_recibido_usd,
              COALESCE(SUM(CASE WHEN moneda = 'VES' THEN monto ELSE 0 END), 0) AS total_recibido_ves
       FROM pagos_contrato
       WHERE fecha_pago >= ? AND fecha_pago < DATE_ADD(?, INTERVAL 1 DAY)`,
      [desde, hasta]
    );

    const [cobrosPorDia] = await pool.query(
      `SELECT fecha_pago AS fecha, COUNT(*) AS pagos_registrados,
              COALESCE(SUM(equivalente_usd), 0) AS total_cobrado_usd,
              COALESCE(SUM(CASE WHEN moneda = 'USD' THEN monto ELSE 0 END), 0) AS total_recibido_usd,
              COALESCE(SUM(CASE WHEN moneda = 'VES' THEN monto ELSE 0 END), 0) AS total_recibido_ves
       FROM pagos_contrato
       WHERE fecha_pago >= ? AND fecha_pago < DATE_ADD(?, INTERVAL 1 DAY)
       GROUP BY fecha_pago
       ORDER BY fecha_pago ASC`,
      [desde, hasta]
    );

    const [saldoContratos] = await pool.query(
      `SELECT COALESCE(SUM(GREATEST(c.monto_total_usd - COALESCE(pagos.total_pagado_usd, 0), 0)), 0)
                AS saldo_pendiente_usd
       FROM contratos_servicio c
       LEFT JOIN (
         SELECT contrato_id, SUM(equivalente_usd) AS total_pagado_usd
         FROM pagos_contrato
         GROUP BY contrato_id
       ) pagos ON pagos.contrato_id = c.id
       WHERE c.estado = 'Aceptado'`
    );

    return {
      resumen: {
        ordenes_entregadas: Number(resumen[0].ordenes_entregadas),
        valor_presupuestado: Number(resumen[0].valor_presupuestado),
        promedio_por_orden: Number(resumen[0].promedio_por_orden),
        saldo_pendiente_contratos_usd: Number(saldoContratos[0].saldo_pendiente_usd),
      },
      por_dia: porDia.map((fila) => ({
        ...fila,
        ordenes_entregadas: Number(fila.ordenes_entregadas),
        valor_presupuestado: Number(fila.valor_presupuestado),
      })),
      cobros: {
        resumen: {
          pagos_registrados: Number(cobrosResumen[0].pagos_registrados),
          contratos_con_pagos: Number(cobrosResumen[0].contratos_con_pagos),
          total_cobrado_usd: Number(cobrosResumen[0].total_cobrado_usd),
          total_recibido_usd: Number(cobrosResumen[0].total_recibido_usd),
          total_recibido_ves: Number(cobrosResumen[0].total_recibido_ves),
        },
        por_dia: cobrosPorDia.map((fila) => ({
          ...fila,
          pagos_registrados: Number(fila.pagos_registrados),
          total_cobrado_usd: Number(fila.total_cobrado_usd),
          total_recibido_usd: Number(fila.total_recibido_usd),
          total_recibido_ves: Number(fila.total_recibido_ves),
        })),
      },
    };
  },
}; // <--- Aquí se cierra correctamente el objeto Orden al final de todo

module.exports = Orden;