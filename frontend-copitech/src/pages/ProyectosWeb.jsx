import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Check,
  ClipboardList,
  Copy,
  ExternalLink,
  FolderKanban,
  Plus,
  Rocket,
} from 'lucide-react';
import './ProyectosWeb.css';

const estadosProyecto = ['Planificación', 'En desarrollo', 'En revisión', 'Completado', 'Pausado'];
const estadosTarea = ['Pendiente', 'En progreso', 'Completada'];
const formularioVacio = { cliente_id: '', nombre: '', descripcion_cliente: '', fecha_entrega: '' };

function fechaCorta(fecha) {
  if (!fecha) return 'Sin fecha de entrega';
  const valor = new Date(`${String(fecha).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(valor.getTime())) return 'Sin fecha de entrega';
  return new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' }).format(valor);
}

export default function ProyectosWeb() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [recargar, setRecargar] = useState(0);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [nuevoProyecto, setNuevoProyecto] = useState(formularioVacio);
  const [tareaNueva, setTareaNueva] = useState({ proyectoId: null, titulo: '', visible_cliente: true });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem('token');
    Promise.all([
      axios.get('/api/proyectos-web', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      }),
      axios.get('/api/clientes?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      }),
    ])
      .then(([proyectosRespuesta, clientesRespuesta]) => {
        setProyectos(proyectosRespuesta.data.proyectos);
        setClientes(clientesRespuesta.data.clientes);
        setError('');
      })
      .catch((err) => {
        if (axios.isCancel(err)) return;
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('usuario');
          navigate('/admin');
          return;
        }
        setError(err.response?.data?.error || 'No se pudieron cargar los proyectos web.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });

    return () => controller.abort();
  }, [navigate, recargar]);

  const cambiarProyecto = (evento) => {
    setNuevoProyecto((actual) => ({ ...actual, [evento.target.name]: evento.target.value }));
  };

  const crearProyecto = async (evento) => {
    evento.preventDefault();
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const { data } = await axios.post('/api/proyectos-web', nuevoProyecto, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setNuevoProyecto(formularioVacio);
      setFormularioAbierto(false);
      setMensaje(`Proyecto «${data.nombre}» creado. Ya puedes compartir su enlace privado.`);
      setRecargar((actual) => actual + 1);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        navigate('/admin');
      } else {
        setError(err.response?.data?.error || 'No se pudo crear el proyecto.');
      }
    } finally {
      setGuardando(false);
    }
  };

  const actualizarEstadoProyecto = async (id, estado) => {
    setError('');
    try {
      await axios.patch(`/api/proyectos-web/${id}/estado`, { estado }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setRecargar((actual) => actual + 1);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo actualizar el proyecto.');
    }
  };

  const renovarEnlace = async (id) => {
    if (!window.confirm('El enlace actual dejará de funcionar. ¿Quieres renovarlo?')) return;
    setError('');
    setMensaje('');
    try {
      await axios.post(`/api/proyectos-web/${id}/enlace`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setMensaje('Enlace renovado. El enlace anterior dejó de funcionar.');
      setRecargar((actual) => actual + 1);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo renovar el enlace privado.');
    }
  };

  const crearTarea = async (evento) => {
    evento.preventDefault();
    if (!tareaNueva.proyectoId) return;
    setGuardando(true);
    setError('');
    try {
      await axios.post(`/api/proyectos-web/${tareaNueva.proyectoId}/tareas`, {
        titulo: tareaNueva.titulo,
        visible_cliente: tareaNueva.visible_cliente,
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setTareaNueva({ proyectoId: null, titulo: '', visible_cliente: true });
      setMensaje('Avance agregado al proyecto.');
      setRecargar((actual) => actual + 1);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo agregar el avance.');
    } finally {
      setGuardando(false);
    }
  };

  const actualizarEstadoTarea = async (proyectoId, tareaId, estado) => {
    setError('');
    try {
      await axios.patch(`/api/proyectos-web/${proyectoId}/tareas/${tareaId}/estado`, { estado }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setRecargar((actual) => actual + 1);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo actualizar la tarea.');
    }
  };

  const copiarEnlace = async (token) => {
    const enlace = `${window.location.origin}/proyecto/${token}`;
    setError('');
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('El navegador no permite copiar el enlace. Ábrelo y cópialo manualmente.');
      }
      await navigator.clipboard.writeText(enlace);
      setMensaje('Enlace privado copiado. Compártelo solo con el cliente de este proyecto.');
    } catch (err) {
      setError(err.message || 'No se pudo copiar el enlace privado.');
    }
  };

  return (
    <main className="admin-page web-projects">
      <header className="admin-page__heading">
        <div>
          <p className="admin-page__eyebrow">DESARROLLO Y PROGRAMACIÓN</p>
          <h1>Proyectos web</h1>
          <p>Organiza tareas y comparte avances con cada cliente mediante un enlace privado.</p>
        </div>
        <button
          className="admin-page__primary-button"
          type="button"
          onClick={() => setFormularioAbierto((abierto) => !abierto)}
        >
          <Plus size={15} /> Nuevo proyecto
        </button>
      </header>

      {error && <div className="admin-page__error" role="alert">{error}</div>}
      {mensaje && <div className="web-projects__notice" role="status">{mensaje}</div>}

      {formularioAbierto && (
        <form className="web-projects__form" onSubmit={crearProyecto}>
          <h2><Rocket size={17} /> Registrar proyecto</h2>
          {clientes.length === 0 ? (
            <p>No hay clientes registrados para asociar. <Link to="/clientes">Revisa la lista de clientes</Link>.</p>
          ) : (
            <>
              <label>
                Cliente
                <select
                  name="cliente_id"
                  value={nuevoProyecto.cliente_id}
                  onChange={cambiarProyecto}
                  required
                >
                  <option value="">Selecciona un cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre} · {cliente.telefono}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nombre del proyecto
                <input
                  name="nombre"
                  value={nuevoProyecto.nombre}
                  onChange={cambiarProyecto}
                  maxLength="150"
                  placeholder="Ej. Sitio web de mi negocio"
                  required
                />
              </label>
              <label>
                Resumen visible para el cliente
                <textarea
                  name="descripcion_cliente"
                  value={nuevoProyecto.descripcion_cliente}
                  onChange={cambiarProyecto}
                  maxLength="3000"
                  rows="3"
                  placeholder="Describe brevemente el objetivo y alcance acordado."
                />
              </label>
              <label>
                Fecha estimada de entrega
                <input
                  type="date"
                  name="fecha_entrega"
                  value={nuevoProyecto.fecha_entrega}
                  onChange={cambiarProyecto}
                />
              </label>
              <div className="web-projects__form-actions">
                <button className="admin-page__primary-button" type="submit" disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Crear proyecto'}
                </button>
                <button className="admin-page__secondary-button" type="button" onClick={() => setFormularioAbierto(false)}>
                  Cancelar
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {cargando ? (
        <div className="admin-page__state"><FolderKanban size={22} /><p>Cargando proyectos...</p></div>
      ) : proyectos.length === 0 ? (
        <section className="admin-page__panel admin-page__state">
          <FolderKanban size={25} />
          <strong>Aún no hay proyectos web</strong>
          <p>Acepta una solicitud, registra al cliente y crea aquí el proyecto que van a desarrollar.</p>
        </section>
      ) : (
        <section className="web-projects__list" aria-label="Proyectos registrados">
          {proyectos.map((proyecto) => {
            const total = Number(proyecto.total_tareas || 0);
            const completadas = Number(proyecto.tareas_completadas || 0);
            const progreso = total ? Math.round((completadas / total) * 100) : 0;
            return (
              <article className="web-project-card" key={proyecto.id}>
                <header className="web-project-card__header">
                  <div>
                    <span className="web-project-card__client">{proyecto.cliente_nombre}</span>
                    <h2>{proyecto.nombre}</h2>
                  </div>
                  <select
                    value={proyecto.estado}
                    aria-label={`Estado del proyecto ${proyecto.nombre}`}
                    onChange={(evento) => actualizarEstadoProyecto(proyecto.id, evento.target.value)}
                  >
                    {estadosProyecto.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
                  </select>
                </header>
                {proyecto.descripcion_cliente && <p className="web-project-card__description">{proyecto.descripcion_cliente}</p>}
                <div className="web-project-card__summary">
                  <span>{fechaCorta(proyecto.fecha_entrega)}</span>
                  <span>{completadas} de {total} tareas completadas</span>
                </div>
                <div className="web-project-card__progress" role="progressbar" aria-valuenow={progreso} aria-valuemin="0" aria-valuemax="100">
                  <span style={{ width: `${progreso}%` }} />
                </div>
                <div className="web-project-card__tasks">
                  <h3><ClipboardList size={15} /> Tareas y avances</h3>
                  {proyecto.tareas.length === 0 ? (
                    <p className="web-project-card__empty">Agrega tareas para organizar el trabajo y mostrar el avance.</p>
                  ) : (
                    <ul>
                      {proyecto.tareas.map((tarea) => (
                        <li key={tarea.id}>
                          <span>{tarea.titulo}{!tarea.visible_cliente && <small> · Solo equipo</small>}</span>
                          <select
                            value={tarea.estado}
                            aria-label={`Estado de ${tarea.titulo}`}
                            onChange={(evento) => actualizarEstadoTarea(proyecto.id, tarea.id, evento.target.value)}
                          >
                            {estadosTarea.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
                          </select>
                        </li>
                      ))}
                    </ul>
                  )}
                  {tareaNueva.proyectoId === proyecto.id ? (
                    <form className="web-project-card__task-form" onSubmit={crearTarea}>
                      <input
                        value={tareaNueva.titulo}
                        onChange={(evento) => setTareaNueva((actual) => ({ ...actual, titulo: evento.target.value }))}
                        maxLength="160"
                        placeholder="Nombre del avance"
                        aria-label="Nombre del avance"
                        required
                      />
                      <label>
                        <input
                          type="checkbox"
                          checked={tareaNueva.visible_cliente}
                          onChange={(evento) => setTareaNueva((actual) => ({ ...actual, visible_cliente: evento.target.checked }))}
                        />
                        Visible para el cliente
                      </label>
                      <button type="submit" disabled={guardando}><Check size={14} /> Agregar</button>
                    </form>
                  ) : (
                    <button
                      className="web-project-card__add-task"
                      type="button"
                      onClick={() => setTareaNueva({ proyectoId: proyecto.id, titulo: '', visible_cliente: true })}
                    >
                      <Plus size={14} /> Agregar tarea
                    </button>
                  )}
                </div>
                <footer className="web-project-card__footer">
                  <button type="button" onClick={() => copiarEnlace(proyecto.token_acceso)}>
                    <Copy size={14} /> Copiar enlace privado
                  </button>
                  <button type="button" onClick={() => renovarEnlace(proyecto.id)}>
                    Renovar enlace
                  </button>
                  <a href={`/proyecto/${proyecto.token_acceso}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={14} /> Vista del cliente
                  </a>
                </footer>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
