const pool = require('../config/db');

const TasaCambio = {
  async obtenerActual(fechaActual) {
    const [rows] = await pool.query(
      `SELECT DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha, usd_ves,
              actualizado_en
       FROM tasas_cambio_bcv
       WHERE fecha <= ?
       ORDER BY fecha DESC
       LIMIT 1`,
      [fechaActual]
    );

    if (rows.length === 0) return null;
    return { ...rows[0], usd_ves: Number(rows[0].usd_ves) };
  },

  async listarHistorial(limite = 90) {
    const [rows] = await pool.query(
      `SELECT DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha, usd_ves,
              actualizado_en
       FROM tasas_cambio_bcv
       ORDER BY fecha DESC
       LIMIT ?`,
      [limite]
    );
    return rows.map((fila) => ({ ...fila, usd_ves: Number(fila.usd_ves) }));
  },

  async guardar(fecha, usdVes) {
    await pool.query(
      `INSERT INTO tasas_cambio_bcv (fecha, usd_ves)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE usd_ves = VALUES(usd_ves)`,
      [fecha, usdVes]
    );
    return this.obtenerActual(fecha);
  },
};

module.exports = TasaCambio;
