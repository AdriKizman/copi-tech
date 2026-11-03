// src/models/cliente.model.js
const pool = require('../config/db');

const Cliente = {
  async listar({ search = '', limit = 50, offset = 0 }) {
    const like = `%${search}%`;
    const where = `WHERE nombre LIKE ? OR telefono LIKE ? OR email LIKE ?`;
    const params = [like, like, like];
    const [conteo] = await pool.query(
      `SELECT COUNT(*) AS total FROM clientes ${where}`,
      params
    );
    const [rows] = await pool.query(
      `SELECT * FROM clientes
       ${where}
       ORDER BY creado_en DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );
    return { clientes: rows, total: Number(conteo[0].total) };
  },

  async buscarPorId(id) {
    const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async crear({ nombre, telefono, email, direccion, notas }) {
    const [result] = await pool.query(
      `INSERT INTO clientes (nombre, telefono, email, direccion, notas)
       VALUES (?, ?, ?, ?, ?)`,
      [nombre, telefono, email || null, direccion || null, notas || null]
    );
    return this.buscarPorId(result.insertId);
  },

  async actualizar(id, datos) {
    const { nombre, telefono, email, direccion, notas } = datos;
    await pool.query(
      `UPDATE clientes
       SET nombre = COALESCE(?, nombre),
           telefono = COALESCE(?, telefono),
           email = COALESCE(?, email),
           direccion = COALESCE(?, direccion),
           notas = COALESCE(?, notas)
       WHERE id = ?`,
      [nombre, telefono, email, direccion, notas, id]
    );
    return this.buscarPorId(id);
  },

  async eliminar(id) {
    const [result] = await pool.query('DELETE FROM clientes WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },
};

module.exports = Cliente;