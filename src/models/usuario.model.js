// src/models/usuario.model.js
const pool = require('../config/db');

const Usuario = {
  async crear({ nombre, email, password_hash }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [configuracion] = await connection.query(
        `SELECT valor FROM configuracion_sistema
         WHERE clave = 'registro_usuarios_habilitado' FOR UPDATE`
      );
      if (configuracion[0]?.valor !== 'true') {
        const error = new Error('El registro de usuarios está deshabilitado');
        error.code = 'REGISTRATION_DISABLED';
        throw error;
      }

      const [result] = await connection.query(
        `INSERT INTO usuarios (nombre, email, password_hash, rol)
         VALUES (?, ?, ?, 'tecnico')`,
        [nombre, email, password_hash]
      );
      await connection.commit();
      return { id: result.insertId, nombre, email, rol: 'tecnico' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async buscarPorEmail(email) {
    const [rows] = await pool.query(
      'SELECT * FROM usuarios WHERE email = ? LIMIT 1',
      [email]
    );
    return rows[0] || null;
  },

  async listar() {
    const [rows] = await pool.query(
      `SELECT id, nombre, email, rol, activo, creado_en
       FROM usuarios ORDER BY nombre, email`
    );
    return rows;
  },

  async buscarPorId(id) {
    const [rows] = await pool.query(
      `SELECT id, nombre, email, rol, activo, creado_en
       FROM usuarios WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async buscarParaAutenticacion(id) {
    const [rows] = await pool.query(
      `SELECT id, email, rol, activo, token_version
       FROM usuarios WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async buscarPassword(id) {
    const [rows] = await pool.query(
      'SELECT password_hash FROM usuarios WHERE id = ? AND activo = 1 LIMIT 1',
      [id]
    );
    return rows[0] || null;
  },

  async registroHabilitado() {
    const [rows] = await pool.query(
      `SELECT valor FROM configuracion_sistema
       WHERE clave = 'registro_usuarios_habilitado' LIMIT 1`
    );
    return rows[0]?.valor === 'true';
  },

  async actualizarRegistroHabilitado(habilitado) {
    await pool.query(
      `INSERT INTO configuracion_sistema (clave, valor)
       VALUES ('registro_usuarios_habilitado', ?)
       ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
      [habilitado ? 'true' : 'false']
    );
    return habilitado;
  },

  async actualizarRol(id, rol, actorId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [administradores] = await connection.query(
        `SELECT id FROM usuarios
         WHERE rol = 'admin' AND activo = 1
         ORDER BY id FOR UPDATE`
      );
      const [usuarios] = await connection.query(
        `SELECT id, rol, activo FROM usuarios WHERE id = ? FOR UPDATE`,
        [id]
      );

      if (!usuarios[0]) {
        await connection.rollback();
        return { resultado: 'no-encontrado' };
      }
      if (String(id) === String(actorId)) {
        await connection.rollback();
        return { resultado: 'propia-cuenta' };
      }
      if (
        usuarios[0].rol === 'admin' &&
        usuarios[0].activo &&
        rol !== 'admin' &&
        administradores.length <= 1
      ) {
        await connection.rollback();
        return { resultado: 'ultimo-administrador' };
      }

      await connection.query(
        'UPDATE usuarios SET rol = ?, token_version = token_version + 1 WHERE id = ?',
        [rol, id]
      );
      await connection.commit();
      return { resultado: 'actualizado', usuario: { id: usuarios[0].id, rol } };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async actualizarActivo(id, activo, actorId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [administradores] = await connection.query(
        `SELECT id FROM usuarios
         WHERE rol = 'admin' AND activo = 1
         ORDER BY id FOR UPDATE`
      );
      const [usuarios] = await connection.query(
        `SELECT id, rol, activo FROM usuarios WHERE id = ? FOR UPDATE`,
        [id]
      );

      if (!usuarios[0]) {
        await connection.rollback();
        return { resultado: 'no-encontrado' };
      }
      if (String(id) === String(actorId)) {
        await connection.rollback();
        return { resultado: 'propia-cuenta' };
      }
      if (
        usuarios[0].activo &&
        usuarios[0].rol === 'admin' &&
        !activo &&
        administradores.length <= 1
      ) {
        await connection.rollback();
        return { resultado: 'ultimo-administrador' };
      }

      await connection.query(
        `UPDATE usuarios
         SET activo = ?, token_version = token_version + 1
         WHERE id = ? AND activo <> ?`,
        [activo ? 1 : 0, id, activo ? 1 : 0]
      );
      await connection.commit();
      return { resultado: 'actualizado', usuario: { id: usuarios[0].id, activo } };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async actualizarPassword(id, password_hash) {
    const [result] = await pool.query(
      `UPDATE usuarios
       SET password_hash = ?, token_version = token_version + 1
       WHERE id = ? AND activo = 1`,
      [password_hash, id]
    );
    return result.affectedRows > 0;
  },
};

module.exports = Usuario;