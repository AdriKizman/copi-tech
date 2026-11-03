// src/controllers/auth.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.model');

function passwordValido(password) {
  return typeof password === 'string' &&
    password.length >= 8 &&
    Buffer.byteLength(password, 'utf8') <= 72;
}

/**
 * POST /api/auth/registro
 * Crea usuarios como técnicos; los permisos se administran por separado.
 */
const registro = async (req, res) => {
  const { nombre, email, password } = req.body;
  const nombreNormalizado = typeof nombre === 'string' ? nombre.trim() : '';
  const emailNormalizado = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!nombreNormalizado || !emailNormalizado || typeof password !== 'string') {
    return res.status(400).json({ error: 'nombre, email y password son obligatorios' });
  }
  if (nombreNormalizado.length > 100) {
    return res.status(400).json({ error: 'El nombre no puede superar 100 caracteres' });
  }
  if (
    emailNormalizado.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)
  ) {
    return res.status(400).json({ error: 'El correo electrónico no es válido' });
  }
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({
      error: 'La contraseña debe tener al menos 8 caracteres y no superar 72 bytes',
    });
  }

  const password_hash = await bcrypt.hash(password, 10);
  try {
    const nuevo = await Usuario.crear({
      nombre: nombreNormalizado,
      email: emailNormalizado,
      password_hash,
    });
    res.status(201).json({ message: 'Usuario creado', usuario: nuevo });
  } catch (error) {
    if (error.code === 'REGISTRATION_DISABLED') {
      return res.status(403).json({ error: error.message });
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    throw error;
  }
};

/**
 * POST /api/auth/login
 * Devuelve el JWT.
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({ error: 'email y password son obligatorios' });
  }

  const usuario = await Usuario.buscarPorEmail(email.trim().toLowerCase());
  if (!usuario || Number(usuario.activo) !== 1) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const valida = await bcrypt.compare(password, usuario.password_hash);
  if (!valida) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      token_version: usuario.token_version ?? 0,
    },
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

const listarUsuarios = async (req, res) => {
  res.json({ usuarios: await Usuario.listar() });
};

const obtenerConfiguracionRegistro = async (req, res) => {
  res.json({ habilitado: await Usuario.registroHabilitado() });
};

const actualizarConfiguracionRegistro = async (req, res) => {
  if (typeof req.body.habilitado !== 'boolean') {
    return res.status(400).json({ error: 'habilitado debe ser verdadero o falso' });
  }
  const habilitado = await Usuario.actualizarRegistroHabilitado(req.body.habilitado);
  res.json({ habilitado });
};

const actualizarRol = async (req, res) => {
  const id = Number(req.params.id);
  const { rol } = req.body;
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ error: 'El usuario indicado no es válido' });
  }
  if (!['admin', 'tecnico'].includes(rol)) {
    return res.status(400).json({ error: 'El rol debe ser admin o tecnico' });
  }

  const resultado = await Usuario.actualizarRol(id, rol, req.usuario.id);
  if (resultado.resultado === 'no-encontrado') {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  if (resultado.resultado === 'propia-cuenta') {
    return res.status(409).json({ error: 'No puedes cambiar el rol de tu propia cuenta' });
  }
  if (resultado.resultado === 'ultimo-administrador') {
    return res.status(409).json({ error: 'Debe mantenerse al menos un administrador activo' });
  }
  res.json({ usuario: resultado.usuario });
};

const actualizarActivo = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ error: 'El usuario indicado no es válido' });
  }
  if (typeof req.body.activo !== 'boolean') {
    return res.status(400).json({ error: 'activo debe ser verdadero o falso' });
  }

  const resultado = await Usuario.actualizarActivo(id, req.body.activo, req.usuario.id);
  if (resultado.resultado === 'no-encontrado') {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  if (resultado.resultado === 'propia-cuenta') {
    return res.status(409).json({ error: 'No puedes cambiar el estado de tu propia cuenta' });
  }
  if (resultado.resultado === 'ultimo-administrador') {
    return res.status(409).json({ error: 'Debe mantenerse al menos un administrador activo' });
  }
  res.json({ usuario: resultado.usuario });
};

const actualizarPassword = async (req, res) => {
  const id = Number(req.params.id);
  const { passwordActual, passwordNueva } = req.body;
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ error: 'El usuario indicado no es válido' });
  }
  if (typeof passwordActual !== 'string' || !passwordActual) {
    return res.status(400).json({ error: 'Debes confirmar tu contraseña actual' });
  }
  if (!passwordValido(passwordNueva)) {
    return res.status(400).json({
      error: 'La nueva contraseña debe tener al menos 8 caracteres y no superar 72 bytes',
    });
  }

  const credenciales = await Usuario.buscarPassword(req.usuario.id);
  if (!credenciales || !(await bcrypt.compare(passwordActual, credenciales.password_hash))) {
    return res.status(403).json({ error: 'La contraseña actual no es correcta' });
  }
  const hash = await bcrypt.hash(passwordNueva, 10);
  const actualizado = await Usuario.actualizarPassword(id, hash);
  if (!actualizado) {
    return res.status(404).json({ error: 'Usuario no encontrado o inactivo' });
  }
  res.json({
    message: 'Contraseña actualizada. Las sesiones anteriores de esa cuenta se cerraron.',
    requiereNuevoLogin: String(id) === String(req.usuario.id),
  });
};

module.exports = {
  registro,
  login,
  perfil,
  listarUsuarios,
  obtenerConfiguracionRegistro,
  actualizarConfiguracionRegistro,
  actualizarRol,
  actualizarActivo,
  actualizarPassword,
};