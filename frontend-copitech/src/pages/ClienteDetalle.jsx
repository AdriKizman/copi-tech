import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ArrowRight, ClipboardList, ContactRound, Mail, Phone } from 'lucide-react';
import './AdminPages.css';

const limite = 15;

function badgeTone(estado) {
  return {
    'En Diagnóstico': 'amber',
    'Esperando Repuesto': 'violet',
    Listo: 'green',
    Entregado: 'slate',
  }[estado] || '';
}

export default function ClienteDetalle() {
  const { id } = useParams();
  const [resultado, setResultado] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    axios
      .get(`/api/clientes/${id}/ordenes?page=${pagina}&limit=${limite}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        signal: controller.signal,
      })
      .then(({ data }) => setResultado(data))
      .catch((err) => {
        if (!axios.isCancel(err)) setError(err.response?.data?.error || 'No se pudo cargar el historial del cliente.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });
    return () => controller.abort();
  }, [id, pagina]);

  if (cargando && !resultado) {
    return <main className="admin-page"><div className="admin-page__panel admin-page__state"><ContactRound size={22} /><p>Cargando cliente...</p></div></main>;
  }

  if (error && !resultado) {
    return <main className="admin-page"><Link className="admin-page__back-link" to="/clientes"><ArrowLeft size={14} /> Volver a clientes</Link><div className="admin-page__error">{error}</div></main>;
  }

  const cliente = resultado?.cliente;
  const ordenes = resultado?.ordenes || [];

  return (
    <main className="admin-page">
      <header className="admin-page__heading">
        <div>
          <Link className="admin-page__back-link" to="/clientes"><ArrowLeft size={14} /> Todos los clientes</Link>
          <p className="admin-page__eyebrow">FICHA DEL CLIENTE</p>
          <h1>{cliente.nombre}</h1>
          <p>Consulta sus datos y todas las reparaciones asociadas.</p>
        </div>
        <div className="admin-page__contact-actions">
          {cliente.telefono && <a className="admin-page__secondary-button" href={`tel:${cliente.telefono}`}><Phone size={14} /> Llamar</a>}
          {cliente.email && <a className="admin-page__secondary-button" href={`mailto:${cliente.email}`}><Mail size={14} /> Correo</a>}
        </div>
      </header>

      <section className="admin-page__summary-grid admin-page__client-summary">
        <article className="admin-page__summary-card"><span>Teléfono</span><strong>{cliente.telefono || 'No registrado'}</strong></article>
        <article className="admin-page__summary-card"><span>Correo electrónico</span><strong>{cliente.email || 'No registrado'}</strong></article>
        <article className="admin-page__summary-card"><span>Órdenes registradas</span><strong>{resultado.total}</strong></article>
      </section>

      {cliente.notas && (
        <section className="admin-page__panel admin-page__client-notes">
          <p className="admin-page__eyebrow">NOTAS DEL CLIENTE</p>
          <p>{cliente.notas}</p>
        </section>
      )}

      <header className="admin-page__section-heading">
        <div><p className="admin-page__eyebrow">HISTORIAL</p><h2>Equipos y reparaciones</h2></div>
      </header>

      <section className="admin-page__panel">
        {error && <div className="admin-page__error">{error}</div>}
        {ordenes.length === 0 ? (
          <div className="admin-page__state"><ClipboardList size={23} /><strong>Sin reparaciones todavía</strong><p>Cuando registres una orden para este cliente, aparecerá aquí.</p></div>
        ) : (
          <div className="admin-page__table-wrap">
            <table className="admin-page__table">
              <thead><tr><th>Código / Equipo</th><th>Falla</th><th>Ingreso</th><th>Estado</th><th /></tr></thead>
              <tbody>
                {ordenes.map((orden) => (
                  <tr key={orden.id}>
                    <td><strong>{orden.codigo_seguimiento}</strong><small>{orden.equipo_marca} {orden.equipo_modelo}</small></td>
                    <td>{orden.falla_reportada}</td>
                    <td>{orden.fecha_ingreso ? new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' }).format(new Date(orden.fecha_ingreso)) : '—'}</td>
                    <td><span className={`admin-page__badge admin-page__badge--${badgeTone(orden.estado)}`}>{orden.estado}</span></td>
                    <td><Link to={`/ordenes/${orden.id}`}>Detalle <ArrowRight size={13} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {resultado.pages > 1 && (
          <footer className="admin-page__pagination">
            <span>Página {pagina} de {resultado.pages} · {resultado.total} órdenes</span>
            <div className="admin-page__pagination-controls">
              <button type="button" disabled={pagina <= 1 || cargando} onClick={() => { setCargando(true); setPagina((actual) => actual - 1); }}><ArrowLeft size={13} /> Anterior</button>
              <button type="button" disabled={pagina >= resultado.pages || cargando} onClick={() => { setCargando(true); setPagina((actual) => actual + 1); }}>Siguiente <ArrowRight size={13} /></button>
            </div>
          </footer>
        )}
      </section>
    </main>
  );
}
