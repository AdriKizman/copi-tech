import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { CircleDollarSign, History, LoaderCircle, Save } from 'lucide-react';
import useTasaCambio from '../hooks/useTasaCambio';
import { fechaActualVenezuela, formatearFechaVenezuela, formatearTasa } from '../utils/moneda';
import './AdminPages.css';

export default function TasaCambio() {
  const { tasa, recargar, error: errorTasa } = useTasaCambio();
  const [fecha, setFecha] = useState(fechaActualVenezuela);
  const [valor, setValor] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarHistorial = useCallback(async () => {
    setCargandoHistorial(true);
    try {
      const { data } = await axios.get('/api/tasa-cambio/historial', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setHistorial(Array.isArray(data.historial) ? data.historial : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cargar el historial de tasas.');
    } finally {
      setCargandoHistorial(false);
    }
  }, []);

  useEffect(() => {
    let activa = true;
    axios.get('/api/tasa-cambio/historial', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(({ data }) => {
        if (activa) setHistorial(Array.isArray(data.historial) ? data.historial : []);
      })
      .catch((err) => {
        if (activa) setError(err.response?.data?.error || 'No se pudo cargar el historial de tasas.');
      })
      .finally(() => {
        if (activa) setCargandoHistorial(false);
      });
    return () => {
      activa = false;
    };
  }, []);

  const guardar = async (evento) => {
    evento.preventDefault();
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      await axios.put(
        '/api/tasa-cambio',
        { fecha, usd_ves: valor ?? (tasa?.fecha === fecha ? String(tasa.usd_ves) : '') },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } },
      );
      await Promise.all([recargar(), cargarHistorial()]);
      setMensaje('Tasa BCV guardada. Los equivalentes en bolívares ya están actualizados.');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar la tasa BCV.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <main className="admin-page">
      <header className="admin-page__heading">
        <div>
          <p className="admin-page__eyebrow">MONEDA Y CONVERSIONES</p>
          <h1>Tasa diaria BCV</h1>
          <p>Registra la tasa oficial del Banco Central de Venezuela para convertir presupuestos de USD a Bs.</p>
        </div>
        <CircleDollarSign size={25} className="admin-page__heading-icon" />
      </header>

      {(error || errorTasa) && <div className="admin-page__error" role="alert">{error || errorTasa}</div>}
      {mensaje && <div className="admin-page__success" role="status">{mensaje}</div>}

      <section className="admin-page__panel admin-page__exchange-panel">
        <div className="admin-page__detail-heading">
          <div>
            <p className="admin-page__eyebrow">TASA ACTIVA</p>
            <h2>
              {tasa
                ? `1 USD = Bs. ${formatearTasa(tasa.usd_ves)}`
                : 'No hay una tasa BCV registrada'}
            </h2>
            <p>
              {tasa
                ? `Vigente desde el ${formatearFechaVenezuela(tasa.fecha)}.`
                : 'Registra la tasa publicada por el BCV para habilitar las conversiones.'}
            </p>
          </div>
        </div>
        <form className="admin-page__exchange-form" onSubmit={guardar}>
          <label>
            Fecha de vigencia
            <input type="date" value={fecha} max={fechaActualVenezuela()} onChange={(evento) => { setFecha(evento.target.value); setValor(''); }} required />
            <small>Solo se permite registrar o actualizar la tasa del día en Venezuela.</small>
          </label>
          <label>
            Bolívares por 1 USD
            <input type="number" min="0.000001" max="999999999999" step="0.000001" value={valor ?? (tasa?.fecha === fecha ? String(tasa.usd_ves) : '')} onChange={(evento) => setValor(evento.target.value)} placeholder="Ej. tasa publicada por el BCV" required />
            <small>Verifica el valor en el BCV antes de guardarlo.</small>
          </label>
          <button className="admin-page__primary-button" type="submit" disabled={guardando}>
            {guardando ? <LoaderCircle className="admin-page__spinner" size={15} /> : <Save size={15} />}
            {guardando ? 'Guardando...' : 'Guardar tasa del día'}
          </button>
        </form>
        <p className="admin-page__exchange-note">
          Los presupuestos se guardan en dólares. El monto en bolívares es una referencia calculada con la última tasa BCV registrada; actualizar la tasa no modifica los presupuestos en USD.
        </p>
      </section>

      <section className="admin-page__panel admin-page__exchange-history">
        <div className="admin-page__detail-heading">
          <div><p className="admin-page__eyebrow">REGISTRO DE CAMBIOS</p><h2><History size={17} /> Historial de tasas</h2></div>
        </div>
        {cargandoHistorial ? (
          <div className="admin-page__state"><LoaderCircle size={20} /><p>Cargando historial...</p></div>
        ) : historial.length === 0 ? (
          <div className="admin-page__state"><History size={22} /><strong>Aún no hay tasas guardadas</strong><p>Al registrar la tasa de hoy, aparecerá aquí.</p></div>
        ) : (
          <div className="admin-page__table-wrap">
            <table className="admin-page__table">
              <thead><tr><th>Fecha BCV</th><th>Tasa (Bs. por USD)</th><th>Última modificación</th></tr></thead>
              <tbody>
                {historial.map((fila) => (
                  <tr key={fila.fecha}>
                    <td>{formatearFechaVenezuela(fila.fecha)}</td>
                    <td><strong>Bs. {formatearTasa(fila.usd_ves)}</strong></td>
                    <td>{new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(fila.actualizado_en))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
