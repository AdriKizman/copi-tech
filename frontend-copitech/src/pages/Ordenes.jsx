import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Search,
  Smartphone,
} from 'lucide-react';
import './AdminPages.css';
import MontoDual from '../components/MontoDual';

const estados = ['Recibido', 'En Diagnóstico', 'Esperando Repuesto', 'Listo', 'Entregado'];
const limite = 20;

function badgeTone(estado) {
  return {
    'En Diagnóstico': 'amber',
    'Esperando Repuesto': 'violet',
    Listo: 'green',
    Entregado: 'slate',
  }[estado] || '';
}

function formatoFecha(fecha) {
  const parsed = fecha ? new Date(fecha) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' }).format(parsed)
    : 'Sin fecha';
}

export default function Ordenes() {
  const [ordenes, setOrdenes] = useState([]);
  const [total, setTotal] = useState(0);
  const [paginas, setPaginas] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [estado, setEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [recargar, setRecargar] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(pagina), limit: String(limite) });
    if (estado) params.set('estado', estado);
    if (busquedaAplicada) params.set('search', busquedaAplicada);

    axios
      .get(`/api/ordenes?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      .then(({ data }) => {
        setOrdenes(data.ordenes);
        setTotal(data.total);
        setPaginas(data.pages);
      })
      .catch((err) => {
        if (!axios.isCancel(err)) {
          setError(err.response?.data?.error || 'No se pudieron cargar las órdenes.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });

    return () => controller.abort();
  }, [busquedaAplicada, estado, pagina, recargar]);

  const buscar = (evento) => {
    evento.preventDefault();
    setCargando(true);
    setPagina(1);
    setBusquedaAplicada(busqueda.trim());
  };

  const cambiarEstado = (value) => {
    setCargando(true);
    setPagina(1);
    setEstado(value);
  };

  return (
    <main className="admin-page">
      <header className="admin-page__heading">
        <div>
          <p className="admin-page__eyebrow">GESTIÓN DEL TALLER</p>
          <h1>Órdenes de reparación</h1>
          <p>Busca, filtra y administra las reparaciones de tus clientes.</p>
        </div>
        <Link className="admin-page__primary-button" to="/nueva-orden">
          <ClipboardList size={16} /> Nueva orden
        </Link>
      </header>

      {error && (
        <div className="admin-page__error" role="alert">
          {error}{' '}
          <button type="button" onClick={() => { setError(''); setCargando(true); setRecargar((value) => value + 1); }}>
            Reintentar
          </button>
        </div>
      )}

      <section className="admin-page__panel">
        <div className="admin-page__toolbar">
          <form className="admin-page__search" onSubmit={buscar} role="search">
            <Search size={16} />
            <input
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar por código, cliente, marca o modelo"
              aria-label="Buscar órdenes"
            />
            <button type="submit" className="admin-page__primary-button">Buscar</button>
          </form>
          <label className="admin-page__filter">
            Estado
            <select value={estado} onChange={(evento) => cambiarEstado(evento.target.value)}>
              <option value="">Todos los estados</option>
              {estados.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
            </select>
          </label>
        </div>

        {cargando ? (
          <div className="admin-page__state"><ClipboardList size={22} /><p>Cargando órdenes...</p></div>
        ) : ordenes.length === 0 ? (
          <div className="admin-page__state">
            <Smartphone size={24} />
            <strong>No hay órdenes para mostrar</strong>
            <p>Ajusta los filtros o crea una nueva orden de reparación.</p>
          </div>
        ) : (
          <div className="admin-page__table-wrap">
            <table className="admin-page__table">
              <thead>
                <tr>
                  <th>Código / Equipo</th>
                  <th>Cliente</th>
                  <th>Ingreso</th>
                  <th>Estado</th>
                  <th>Presupuesto</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ordenes.map((orden) => (
                  <tr key={orden.id}>
                    <td>
                      <strong>{orden.codigo_seguimiento}</strong>
                      <small>{orden.equipo_marca} {orden.equipo_modelo}</small>
                    </td>
                    <td>
                      <strong>{orden.cliente_nombre}</strong>
                      <small>{orden.cliente_telefono}</small>
                    </td>
                    <td>{formatoFecha(orden.fecha_ingreso)}</td>
                    <td><span className={`admin-page__badge admin-page__badge--${badgeTone(orden.estado)}`}>{orden.estado}</span></td>
                    <td><MontoDual monto={orden.presupuesto} /></td>
                    <td><Link to={`/ordenes/${orden.id}`}>Ver detalle <ArrowRight size={13} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="admin-page__pagination">
          <span>
            {total === 0 ? 'Sin resultados' : `Mostrando ${(pagina - 1) * limite + 1}–${Math.min(pagina * limite, total)} de ${total} órdenes`}
          </span>
          <div className="admin-page__pagination-controls">
            <button type="button" disabled={pagina <= 1 || cargando} onClick={() => { setCargando(true); setPagina((actual) => actual - 1); }}>
              <ArrowLeft size={13} /> Anterior
            </button>
            <button type="button" disabled={pagina >= paginas || cargando} onClick={() => { setCargando(true); setPagina((actual) => actual + 1); }}>
              Siguiente <ArrowRight size={13} />
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}
