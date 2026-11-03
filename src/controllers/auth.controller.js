// src/controllers/auth.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.model');

/**
 * POST /api/auth/registro
 * Crea un nuevo usuario. Solo el primer usuario puede ser admin libremente;
 * después, para crear admins se requiere estar autenticado como admin.
 */
const registro = async (req, res) => {
  const { nombre, email, password, rol } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'nombre, email y password son obligatorios' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  const existe = await Usuario.buscarPorEmail(email);
  if (existe) {
    return res.status(409).json({ error: 'El email ya está registrado' });
  }

  const password_hash = await bcrypt.hash(password, 10);

  const nuevo = await Usuario.crear({
    nombre,
    email,
    password_hash,
    rol: rol === 'admin' ? 'admin' : 'tecnico',
  });

  res.status(201).json({ message: 'Usuario creado', usuario: nuevo });
};

/**
 * POST /api/auth/login
 * Devuelve el JWT.
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email y password son obligatorios' });
  }

  const usuario = await Usuario.buscarPorEmail(email);
  if (!usuario || !usuario.activo) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const valida = await bcrypt.compare(password, usuario.password_hash);
  if (!valida) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = jwt.sign(
    { id: usuario.id, email: usuario.email, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.json({
    message: 'Login exitoso',
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    },
  });
};

/**
 * GET /api/auth/perfil
 * Devuelve los datos del usuario autenticado.
 */
const perfil = async (req, res) => {
  const usuario = await Usuario.buscarPorId(req.usuario.id);
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(usuario);
};

module.exports = { registro, login, perfil };