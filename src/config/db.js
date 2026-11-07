// src/config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// Pool de conexiones con valores por defecto de respaldo y SSL requerido para TiDB Cloud
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'copitech',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '-04:00',
  ssl: {
    rejectUnauthorized: false
  }
});

// Verificación rápida al arrancar
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('Conexión a MySQL establecida correctamente');
    conn.release();
  } catch (err) {
    console.error('Error conectando a MySQL:', err.message);
    process.exit(1);
  }
})();

module.exports = pool;
