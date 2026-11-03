const crypto = require('crypto');
const pool = require('../config/db');

const camposContrato = `
  c.*, cl.nombre AS cliente_nombre, cl.telefono AS cliente_telefono,
  cl.email AS cliente_email, cl.direccion AS cliente_direccion,
  o.codigo_seguimiento, o.equipo_marca, o.equipo_modelo, o.numero_serie,
  o.falla_reportada, o.tracking_token,
  p.nombre AS proyecto_nombre, p.token_acceso AS proyecto_tracking_token
`;

const joinsContrato = `
  FROM contratos_servicio c
  INNER JOIN clientes cl ON cl.id = c.cliente_id
  LEFT JOIN ordenes_reparacion o ON o.id = c.orden_id
  LEFT JOIN proyectos_web p ON p.id = c.proyecto_web_id
`;

const Contrato = {
  async listar() {
    const [contratos] = await pool.query(
      `SELECT ${camposContrato},
              COALESCE(pagos.total_pagado_usd, 0) AS total_pagado_usd,
              GREATEST(c.monto_total_usd - COALESCE(pagos.total_pagado_usd, 0), 0) AS saldo_pendiente_usd
       ${joinsContrato}
       LEFT JOIN (
         SELECT contrato_id, SUM(equivalente_usd) AS total_pagado_usd
         FROM pagos_contrato
         GROUP BY contrato_id
       ) pagos ON pagos.contrato_id = c.id
       ORDER BY c.creado_en DESC, c.id DESC`
    );
    return contratos.map((contrato) => ({
      ...contrato,
      monto_total_usd: Number(contrato.monto_total_usd),
      total_pagado_usd: Number(contrato.total_pagado_usd),
      saldo_pendiente_usd: Number(contrato.saldo_pendiente_usd),
    }));
  },

  async buscarPorId(id) {
    const [contratos] = await pool.query(
      `SELECT ${camposContrato},
              COALESCE(pagos.total_pagado_usd, 0) AS total_pagado_usd,
              GREATEST(c.monto_total_usd - COALESCE(pagos.total_pagado_usd, 0), 0) AS saldo_pendiente_usd
       ${joinsContrato}
       LEFT JOIN (
         SELECT contrato_id, SUM(equivalente_usd) AS total_pagado_usd
         FROM pagos_contrato
         GROUP BY contrato_id
       ) pagos ON pagos.contrato_id = c.id
       WHERE c.id = ?`,
      [id]
    );
    const contrato = contratos[0];
    if (!contrato) return null;

    const [pagos] = await pool.query(
      `SELECT id, contrato_id, monto, moneda, tasa_usd_ves, equivalente_usd,
              metodo, referencia, fecha_pago, registrado_en
       FROM pagos_contrato
       WHERE contrato_id = ?
       ORDER BY fecha_pago DESC, id DESC`,
      [id]
    );
    return {
      ...contrato,
      monto_total_usd: Number(contrato.monto_total_usd),
      total_pagado_usd: Number(contrato.total_pagado_usd),
      saldo_pendiente_usd: Number(contrato.saldo_pendiente_usd),
      pagos: pagos.map((pago) => ({
        ...pago,
        monto: Number(pago.monto),
        tasa_usd_ves: pago.tasa_usd_ves === null ? null : Number(pago.tasa_usd_ves),
        equivalente_usd: Number(pago.equivalente_usd),
      })),
    };
  },

  async crear(datos) {
    const conexion = await pool.getConnection();
    const tokenPublico = crypto.randomBytes(32).toString('hex');
    try {
      await conexion.beginTransaction();
      const codigo = `CT-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const [resultado] = await conexion.query(
        `INSERT INTO contratos_servicio
         (codigo, cliente_id, orden_id, proyecto_web_id, solicitud_id, tipo_trabajo,
          titulo, alcance, condiciones, garantia_condiciones, fecha_entrega,
          monto_total_usd, prestador_nombre, prestador_identificacion,
          prestador_direccion, prestador_telefono, prestador_email, token_publico)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          codigo,
          datos.cliente_id,
          datos.orden_id,
          datos.proyecto_web_id,
          datos.solicitud_id,
          datos.tipo_trabajo,
          datos.titulo,
          datos.alcance,
          datos.condiciones,
          datos.garantia_condiciones,
          datos.fecha_entrega,
          datos.monto_total_usd,
          datos.prestador_nombre,
          datos.prestador_identificacion,
          datos.prestador_direccion,
          datos.prestador_telefono,
          datos.prestador_email,
          tokenPublico,
        ]
      );
      await conexion.commit();
      return this.buscarPorId(resultado.insertId);
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  },

  async cambiarEstado(id, estado) {
    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();
      const [contratos] = await conexion.query(
        'SELECT estado FROM contratos_servicio WHERE id = ? FOR UPDATE',
        [id]
      );
      if (!contratos[0]) {
        const error = new Error('Contrato no encontrado');
        error.status = 404;
        throw error;
      }
      if (contratos[0].estado === 'Aceptado' || contratos[0].estado === 'Cancelado') {
        const error = new Error('Un contrato aceptado o cancelado no puede cambiar de estado');
        error.status = 409;
        throw error;
      }
      if (estado === 'Cancelado') {
        const [pagos] = await conexion.query(
          'SELECT COUNT(*) AS cantidad FROM pagos_contrato WHERE contrato_id = ?',
          [id]
        );
        if (Number(pagos[0].cantidad) > 0) {
          const error = new Error('No se puede cancelar un contrato con pagos registrados. Registra primero la devolución o conciliación correspondiente.');
          error.status = 409;
          throw error;
        }
      }
      const campos = {
        Enviado: "estado = 'Enviado', enviado_en = COALESCE(enviado_en, CURRENT_TIMESTAMP)",
        Aceptado: "estado = 'Aceptado', aceptado_en = COALESCE(aceptado_en, CURRENT_TIMESTAMP)",
        Cancelado: "estado = 'Cancelado'",
      };
      await conexion.query(
        `UPDATE contratos_servicio SET ${campos[estado]} WHERE id = ?`,
        [id]
      );
      await conexion.commit();
      return this.buscarPorId(id);
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  },

  async registrarPago(id, pago) {
    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();
      const [contratos] = await conexion.query(
        `SELECT monto_total_usd, estado
         FROM contratos_servicio
         WHERE id = ?
         FOR UPDATE`,
        [id]
      );
      const contrato = contratos[0];
      if (!contrato) {
        const error = new Error('Contrato no encontrado');
        error.status = 404;
        throw error;
      }
      if (contrato.estado !== 'Aceptado') {
        const error = new Error('El contrato debe estar marcado como aceptado antes de registrar pagos');
        error.status = 409;
        throw error;
      }

      const [sumas] = await conexion.query(
        'SELECT COALESCE(SUM(equivalente_usd), 0) AS pagado FROM pagos_contrato WHERE contrato_id = ?',
        [id]
      );
      const saldo = Number(contrato.monto_total_usd) - Number(sumas[0].pagado);
      if (pago.equivalente_usd > saldo + 0.0001) {
        const error = new Error(`El pago supera el saldo pendiente de $${Math.max(saldo, 0).toFixed(2)}`);
        error.status = 400;
        throw error;
      }

      const [resultado] = await conexion.query(
        `INSERT INTO pagos_contrato
         (contrato_id, monto, moneda, tasa_usd_ves, equivalente_usd,
          metodo, referencia, fecha_pago)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          pago.monto,
          pago.moneda,
          pago.tasa_usd_ves,
          pago.equivalente_usd,
          pago.metodo,
          pago.referencia,
          pago.fecha_pago,
        ]
      );
      await conexion.commit();
      const [pagos] = await pool.query(
        `SELECT id, contrato_id, monto, moneda, tasa_usd_ves, equivalente_usd,
                metodo, referencia, fecha_pago, registrado_en
         FROM pagos_contrato WHERE id = ?`,
        [resultado.insertId]
      );
      return { ...pagos[0], monto: Number(pagos[0].monto), equivalente_usd: Number(pagos[0].equivalente_usd) };
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  },

  async buscarPublico(token) {
    const [rows] = await pool.query(
      `SELECT c.codigo, c.tipo_trabajo, c.titulo, c.alcance, c.condiciones,
              c.garantia_condiciones, c.fecha_entrega, c.monto_total_usd,
              c.prestador_nombre, c.prestador_identificacion, c.prestador_direccion,
              c.prestador_telefono, c.prestador_email, c.estado,
              cl.nombre AS cliente_nombre, cl.telefono AS cliente_telefono,
              cl.email AS cliente_email, cl.direccion AS cliente_direccion,
              o.codigo_seguimiento, o.equipo_marca, o.equipo_modelo,
              o.numero_serie, o.falla_reportada, o.tracking_token,
              p.nombre AS proyecto_nombre, p.token_acceso AS proyecto_tracking_token
       ${joinsContrato}
       WHERE c.token_publico = ?`,
      [token]
    );
    if (!rows[0]) return null;

    const [pagos] = await pool.query(
      `SELECT monto, moneda, equivalente_usd, metodo, fecha_pago
       FROM pagos_contrato
       WHERE contrato_id = (
         SELECT id FROM contratos_servicio WHERE token_publico = ?
       )
       ORDER BY fecha_pago, id`,
      [token]
    );
    const totalPagado = pagos.reduce((total, pago) => total + Number(pago.equivalente_usd), 0);
    return {
      ...rows[0],
      monto_total_usd: Number(rows[0].monto_total_usd),
      total_pagado_usd: totalPagado,
      saldo_pendiente_usd: Math.max(Number(rows[0].monto_total_usd) - totalPagado, 0),
      pagos: pagos.map((pago) => ({
        ...pago,
        monto: Number(pago.monto),
        equivalente_usd: Number(pago.equivalente_usd),
      })),
    };
  },
};

module.exports = Contrato;
