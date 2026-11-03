// src/models/usuario.model.js
const pool = require('../config/db');

const Usuario = {
  async crear({ nombre, email, password_hash, rol }) {
    const [result] = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol)
       VALUES (?, ?, ?, ?)`,
      [nombre, email, password_hash, rol || 'tecnico']
    );
    return { id: result.insertId, nombre, email, rol };
  },

  async buscarPorEmail(email) {
    const [rows] = await pool.query(
      'SELECT * FROM usuarios WHERE email = ? LIMIT 1',
      [email]
    );
    return rows[0] || null;
  },

  async buscarPorId(id) {
    const [rows] = await pool.query(
      `SELECT id, nombre, email, rol, activo, creado_en
       FROM usuarios WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },
};

module.exports = Usuario;