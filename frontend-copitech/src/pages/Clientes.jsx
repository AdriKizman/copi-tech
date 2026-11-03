import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ArrowRight, ContactRound, Mail, Phone, Search } from 'lucide-react';
import './AdminPages.css';

const limite = 20;

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [total, setTotal] = useState(0);
  const [paginas, setPaginas] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [aplicada, setAplicada] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(pagina), limit: String(limite) });
    if (aplicada) params.set('search', aplicada);

    axios
      .get(`/api/clientes?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        signal: controller.signal,
      })
      .then(({ data }) => {
        setClientes(data.clientes);
        setTotal(data.total);
        setPaginas(data.pages);
      })
      .catch((err) => {
        if (!axios.isCancel(err)) setError(err.response?.data?.error || 'No se pudieron cargar los clientes.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });

    return () => controller.abort();
  }, [aplicada, pagina]);

  const buscar = (evento) => {
    evento.preventDefault();
    setCargando(true);
    setPagina(1);
    setAplicada(busqueda.trim());
  };

  return (
    <main className="admin-page">
      <header className="admin-page__heading">
        <div>
          <p className="admin-page__eyebrow">RELACIÓN CON CLIENTES</p>
          <h1>Clientes</h1>
          <p>Consulta sus datos y el historial de equipos atendidos.</p>
        </div>
        <span className="admin-page__total"><ContactRound size={15} /> {total} registrados</span>
      </header>

      {error && <div className="admin-page__error" role="alert">{error}</div>}

      <section className="admin-page__panel">
        <div className="admin-page__toolbar">
          <form className="admin-page__search" onSubmit={buscar} role="search">
            <Search size={16} />
            <input value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar por nombre, teléfono o correo" aria-label="Buscar clientes" />
            <button type="submit" className="admin-page__primary-button">Buscar</button>
          </form>
        </div>

        {cargando ? (
          <div className="admin-page__state"><ContactRound size={22} /><p>Cargando clientes...</p></div>
        ) : clientes.length === 0 ? (
          <div className="admin-page__state"><ContactRound size={22} /><strong>No hay clientes para mostrar</strong><p>Prueba otra búsqueda o registra un cliente con una nueva orden.</p></div>
        ) : (
          <div className="admin-page__table-wrap">
            <table className="admin-page__table">
              <thead><tr><th>Cliente</th><th>Contacto</th><th>Registrado</th><th /></tr></thead>
              <tbody>
                {clientes.map((cliente) => (
                  <tr key={cliente.id}>
                    <td><Link to={`/clientes/${cliente.id}`}><strong>{cliente.nombre}</strong></Link></td>
                    <td>
                      <span className="admin-page__contact-cell"><Phone size={12} /> {cliente.telefono}</span>
                      {cliente.email && <small className="admin-page__contact-cell"><Mail size={12} /> {cliente.email}</small>}
                    </td>
                    <td>{cliente.creado_en ? new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' }).format(new Date(cliente.creado_en)) : '—'}</td>
                    <td><Link to={`/clientes/${cliente.id}`}>Ver historial <ArrowRight size={13} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="admin-page__pagination">
          <span>{total === 0 ? 'Sin resultados' : `Mostrando ${(pagina - 1) * limite + 1}–${Math.min(pagina * limite, total)} de ${total} clientes`}</span>
          <div className="admin-page__pagination-controls">
            <button type="button" disabled={pagina <= 1 || cargando} onClick={() => { setCargando(true); setPagina((actual) => actual - 1); }}><ArrowLeft size={13} /> Anterior</button>
            <button type="button" disabled={pagina >= paginas || cargando} onClick={() => { setCargando(true); setPagina((actual) => actual + 1); }}>Siguiente <ArrowRight size={13} /></button>
          </div>
        </footer>
      </section>
    </main>
  );
}
