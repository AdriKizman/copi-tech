const crypto = require('crypto');
const pool = require('../config/db');

const ProyectoWeb = {
  async listar() {
    const [proyectos] = await pool.query(
      `SELECT p.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono,
              COUNT(t.id) AS total_tareas,
              COALESCE(SUM(t.estado = 'Completada'), 0) AS tareas_completadas
       FROM proyectos_web p
       INNER JOIN clientes c ON c.id = p.cliente_id
       LEFT JOIN tareas_proyecto_web t ON t.proyecto_id = p.id
       GROUP BY p.id, c.nombre, c.telefono
       ORDER BY p.actualizado_en DESC, p.id DESC`
    );

    if (proyectos.length === 0) return [];

    const ids = proyectos.map((proyecto) => proyecto.id);
    const [tareas] = await pool.query(
      `SELECT id, proyecto_id, titulo, estado, visible_cliente, creada_en
       FROM tareas_proyecto_web
       WHERE proyecto_id IN (?)
       ORDER BY creada_en, id`,
      [ids]
    );
    const tareasPorProyecto = new Map();
    for (const tarea of tareas) {
      const lista = tareasPorProyecto.get(tarea.proyecto_id) || [];
      lista.push(tarea);
      tareasPorProyecto.set(tarea.proyecto_id, lista);
    }

    return proyectos.map((proyecto) => ({
      ...proyecto,
      tareas: tareasPorProyecto.get(proyecto.id) || [],
    }));
  },

  async buscarPorId(id) {
    const [proyectos] = await pool.query(
      `SELECT p.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono
       FROM proyectos_web p
       INNER JOIN clientes c ON c.id = p.cliente_id
       WHERE p.id = ?`,
      [id]
    );
    const proyecto = proyectos[0];
    if (!proyecto) return null;

    const [tareas] = await pool.query(
      `SELECT id, proyecto_id, titulo, estado, visible_cliente, creada_en
       FROM tareas_proyecto_web
       WHERE proyecto_id = ?
       ORDER BY creada_en, id`,
      [id]
    );
    return { ...proyecto, tareas };
  },

  async crear({ cliente_id, nombre, descripcion_cliente, fecha_entrega }) {
    const token = crypto.randomBytes(32).toString('hex');
    const [resultado] = await pool.query(
      `INSERT INTO proyectos_web
       (cliente_id, nombre, descripcion_cliente, fecha_entrega, token_acceso)
       VALUES (?, ?, ?, ?, ?)`,
      [cliente_id, nombre, descripcion_cliente || null, fecha_entrega || null, token]
    );
    return this.buscarPorId(resultado.insertId);
  },

  async cambiarEstado(id, estado) {
    await pool.query('UPDATE proyectos_web SET estado = ? WHERE id = ?', [estado, id]);
    return this.buscarPorId(id);
  },

  async renovarEnlace(id) {
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query('UPDATE proyectos_web SET token_acceso = ? WHERE id = ?', [token, id]);
    return this.buscarPorId(id);
  },

  async crearTarea(proyectoId, { titulo, visible_cliente }) {
    const [resultado] = await pool.query(
      `INSERT INTO tareas_proyecto_web (proyecto_id, titulo, visible_cliente)
       VALUES (?, ?, ?)`,
      [proyectoId, titulo, visible_cliente ? 1 : 0]
    );
    const [tareas] = await pool.query(
      `SELECT id, proyecto_id, titulo, estado, visible_cliente, creada_en
       FROM tareas_proyecto_web WHERE id = ?`,
      [resultado.insertId]
    );
    return tareas[0];
  },

  async cambiarEstadoTarea(proyectoId, tareaId, estado) {
    const [resultado] = await pool.query(
      `UPDATE tareas_proyecto_web SET estado = ?
       WHERE id = ? AND proyecto_id = ?`,
      [estado, tareaId, proyectoId]
    );
    if (resultado.affectedRows === 0) return null;

    const [tareas] = await pool.query(
      `SELECT id, proyecto_id, titulo, estado, visible_cliente, creada_en
       FROM tareas_proyecto_web WHERE id = ?`,
      [tareaId]
    );
    return tareas[0] || null;
  },

  async buscarPorToken(token) {
    const [proyectos] = await pool.query(
      `SELECT p.id AS proyecto_id, p.nombre, p.descripcion_cliente, p.estado, p.fecha_entrega
       FROM proyectos_web p
       WHERE p.token_acceso = ?`,
      [token]
    );
    const proyecto = proyectos[0];
    if (!proyecto) return null;

    const [tareas] = await pool.query(
      `SELECT titulo, estado
       FROM tareas_proyecto_web
       WHERE proyecto_id = ? AND visible_cliente = 1
       ORDER BY creada_en, id`,
      [proyecto.proyecto_id]
    );
    const completadas = tareas.filter((tarea) => tarea.estado === 'Completada').length;
    return {
      nombre: proyecto.nombre,
      descripcion_cliente: proyecto.descripcion_cliente,
      estado: proyecto.estado,
      fecha_entrega: proyecto.fecha_entrega,
      tareas,
      progreso: tareas.length ? Math.round((completadas / tareas.length) * 100) : 0,
    };
  },
};

module.exports = ProyectoWeb;
