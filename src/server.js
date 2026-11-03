// server.js
require('dotenv').config();
const app = require('./app.js');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(` Servidor corriendo en http://localhost:${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/api/health`);
});