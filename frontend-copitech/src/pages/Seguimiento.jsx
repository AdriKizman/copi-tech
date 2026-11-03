import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CalendarDays, ClipboardList, LoaderCircle, Wrench } from 'lucide-react';
import { formatearFechaVenezuela } from '../utils/moneda';
import './Seguimiento.css';

const estados = ['Recibido', 'En Diagnóstico', 'Esperando Repuesto', 'Listo', 'Entregado'];

export default function Seguimiento() {
  const { token } = useParams();
  const [orden, setOrden] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    axios.get(`/api/ordenes/seguimiento/${encodeURIComponent(token)}`, { signal: controller.signal })
      .then(({ data }) => setOrden(data))
      .catch((err) => {
        if (!axios.isCancel(err)) setError(err.response?.data?.error || 'No se pudo consultar la orden.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });
    return () => controller.abort();
  }, [token]);

  return (
    <main className="public-tracking">
      <header className="public-tracking__header">
        <Link to="/">
          <img src="/logo_principal.png" alt="" />
          CopiTech
        </Link>
        <span>Seguimiento de reparación</span>
      </header>
      <div className="public-tracking__content">
        <Link className="public-tracking__back" to="/"><ArrowLeft size={15} /> Ir al inicio</Link>
        {cargando ? (
          <section className="public-tracking__state"><LoaderCircle className="admin-page__spinner" size={24} /><p>Consultando tu orden...</p></section>
        ) : error || !orden ? (
          <section className="public-tracking__state">
            <ClipboardList size={26} />
            <h1>No encontramos esta orden</h1>
            <p>{error || 'Verifica el enlace privado e inténtalo de nuevo.'}</p>
          </section>
        ) : (
          <>
            <header className="public-tracking__title">
              <span>ORDEN {orden.codigo_seguimiento}</span>
              <h1>{orden.equipo_marca} {orden.equipo_modelo}</h1>
              <p>Aquí puedes consultar el estado actual de tu reparación.</p>
            </header>
            <section className="public-tracking__card">
              <div className="public-tracking__status">
                <span><Wrench size={18} /></span>
                <div><small>ESTADO ACTUAL</small><strong>{orden.estado}</strong></div>
              </div>
              <div className="public-tracking__timeline" aria-label="Progreso de la reparación">
                {estados.map((estado, indice) => (
                  <div className={indice <= estados.indexOf(orden.estado) ? 'is-complete' : ''} key={estado}>
                    <i />
                    <span>{estado}</span>
                  </div>
                ))}
              </div>
              <div className="public-tracking__metadata">
                <span><CalendarDays size={15} /> Recibido el {formatearFechaVenezuela(String(orden.fecha_ingreso).slice(0, 10))}</span>
              </div>
            </section>
            <footer className="public-tracking__footer">Si tienes dudas sobre tu reparación, comunícate directamente con CopiTech.</footer>
          </>
        )}
      </div>
    </main>
  );
}
