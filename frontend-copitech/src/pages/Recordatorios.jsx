import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AlertTriangle, ArrowRight, BellRing, CheckCircle, Clock3, Phone } from 'lucide-react';
import './AdminPages.css';

function formatoDias(dias) {
  return `${dias} ${dias === 1 ? 'día' : 'días'}`;
}

export default function Recordatorios() {
  const [dias, setDias] = useState(7);
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    axios
      .get(`/api/ordenes/recordatorios?dias=${dias}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        signal: controller.signal,
      })
      .then(({ data }) => setResultado(data))
      .catch((err) => {
        if (!axios.isCancel(err)) setError(err.response?.data?.error || 'No se pudieron cargar los recordatorios.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });
    return () => controller.abort();
  }, [dias]);

  const cambiarDias = (valor) => {
    setCargando(true);
    setError('');
    setDias(Number(valor));
  };

  const renderOrdenes = (ordenes, tipo) => {
    if (ordenes.length === 0) {
      return <div className="admin-page__state admin-page__state--compact"><CheckCircle size={20} /><p>{tipo === 'listas' ? 'No hay equipos pendientes de entrega.' : `No hay órdenes sin actualización por más de ${formatoDias(dias)}.`}</p></div>;
    }

    return (
      <div className="admin-page__reminder-list">
        {ordenes.map((orden) => (
          <article className="admin-page__reminder" key={orden.id}>
            <span className={`admin-page__reminder-icon admin-page__reminder-icon--${tipo}`}>
              {tipo === 'listas' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            </span>
            <div className="admin-page__reminder-main">
              <Link to={`/ordenes/${orden.id}`}><strong>{orden.equipo_marca} {orden.equipo_modelo}</strong></Link>
              <span>{orden.codigo_seguimiento} · {orden.cliente_nombre}</span>
              <small>
                {tipo === 'listas'
                  ? `Estado actualizado hace ${formatoDias(orden.dias_lista)}`
                  : `Sin actualización hace ${formatoDias(orden.dias_sin_actualizar)}`}
              </small>
            </div>
            <span className={`admin-page__badge admin-page__badge--${tipo === 'listas' ? 'green' : 'amber'}`}>
              {orden.estado}
            </span>
            {orden.cliente_telefono && (
              <a className="admin-page__round-action" href={`tel:${orden.cliente_telefono}`} aria-label={`Llamar a ${orden.cliente_nombre}`}>
                <Phone size={15} />
              </a>
            )}
            <Link className="admin-page__round-action" to={`/ordenes/${orden.id}`} aria-label="Ver detalle"><ArrowRight size={15} /></Link>
          </article>
        ))}
      </div>
    );
  };

  return (
    <main className="admin-page">
      <header className="admin-page__heading">
        <div>
          <p className="admin-page__eyebrow">PENDIENTES DEL TALLER</p>
          <h1>Recordatorios</h1>
          <p>Detecta órdenes que necesitan seguimiento y equipos listos para entregar.</p>
        </div>
        <label className="admin-page__filter">
          Avisar después de
          <select value={dias} onChange={(evento) => cambiarDias(evento.target.value)}>
            <option value="3">3 días</option>
            <option value="7">7 días</option>
            <option value="14">14 días</option>
            <option value="30">30 días</option>
          </select>
        </label>
      </header>

      {error && <div className="admin-page__error" role="alert">{error}</div>}
      {cargando ? (
        <div className="admin-page__panel admin-page__state"><BellRing size={22} /><p>Revisando órdenes...</p></div>
      ) : resultado && (
        <div className="admin-page__reminder-columns">
          <section className="admin-page__panel admin-page__reminder-panel">
            <header><span className="admin-page__reminder-heading-icon admin-page__reminder-heading-icon--amber"><Clock3 size={17} /></span><div><h2>Requieren seguimiento</h2><p>Sin actualizar durante {formatoDias(dias)} o más</p></div><b>{resultado.atrasadas.length}</b></header>
            {renderOrdenes(resultado.atrasadas, 'atrasadas')}
          </section>
          <section className="admin-page__panel admin-page__reminder-panel">
            <header><span className="admin-page__reminder-heading-icon admin-page__reminder-heading-icon--green"><CheckCircle size={17} /></span><div><h2>Listas para entregar</h2><p>Avísales a tus clientes que pueden recoger su equipo</p></div><b>{resultado.listas.length}</b></header>
            {renderOrdenes(resultado.listas, 'listas')}
          </section>
        </div>
      )}
      <p className="admin-page__reminder-note">
        Estos recordatorios aparecen en el panel mientras desarrollamos las notificaciones automáticas.
      </p>
    </main>
  );
}
