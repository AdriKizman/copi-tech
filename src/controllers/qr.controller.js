const QRCode = require('qrcode');
const Orden = require('../models/orden.model');

const generarQR = async (req, res) => {
  const { token } = req.params;

  if (!/^[a-f0-9]{64}$/.test(token)) {
    return res.status(404).json({ error: 'Enlace de seguimiento no encontrado' });
  }
  const orden = await Orden.buscarPorTokenSeguimiento(token);
  if (!orden) return res.status(404).json({ error: 'Enlace de seguimiento no encontrado' });

  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const urlSeguimiento = `${frontendUrl}/seguimiento/${encodeURIComponent(token)}`;

  res.set('Cache-Control', 'no-store');
  res.set('X-Robots-Tag', 'noindex, nofollow');
  if (req.query.format === 'png') {
    const imagen = await QRCode.toBuffer(urlSeguimiento, {
      type: 'png',
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
    return res.type('png').send(imagen);
  }

  const qrDataUrl = await QRCode.toDataURL(urlSeguimiento, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' }
  });

  res.send(`
    <div style="text-align: center; font-family: sans-serif; padding: 20px;">
      <h2>Orden: ${orden.codigo_seguimiento}</h2>
      <img src="${qrDataUrl}" alt="QR Code" />
      <p>Escanear para ver estado</p>
      <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">Imprimir</button>
    </div>
  `);
};

module.exports = { generarQR };