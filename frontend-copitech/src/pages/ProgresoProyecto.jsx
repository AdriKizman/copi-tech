import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CalendarDays, CheckCircle, Circle, LoaderCircle, Wrench } from 'lucide-react';
import './ProyectosWeb.css';

export default function ProgresoProyecto() {
  const { token } = useParams();
  const [proyecto, setProyecto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    axios.get(`/api/proyectos-web/publico/${encodeURIComponent(token)}`, { signal: controller.signal })
      .then(({ data }) => setProyecto(data))
      .catch((err) => {
        if (!axios.isCancel(err)) {
          setError(err.response?.data?.error || 'No se pudo consultar el avance del proyecto.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });
    return () => controller.abort();
  }, [token]);

  return (
    <main className="project-progress">
      <header className="project-progress__header">
        <Link to="/" aria-label="CopiTech, ir al inicio">
          <img src="/logo_principal.png" alt="" />
          <strong>CopiTech</strong>
        </Link>
        <span>Avance de proyecto</span>
      </header>
      <div className="project-progress__content">
        <Link className="project-progress__back" to="/"><ArrowLeft size={15} /> Ir al inicio</Link>
        {cargando ? (
          <section className="project-progress__state">
            <LoaderCircle className="admin-page__spinner" size={24} />
            <p>Consultando el proyecto...</p>
          </section>
        ) : error || !proyecto ? (
          <section className="project-progress__state">
            <Wrench size={25} />
            <h1>No encontramos este proyecto</h1>
            <p>{error || 'Verifica que el enlace privado sea correcto.'}</p>
          </section>
        ) : (
          <>
            <section className="project-progress__overview">
              <p className="project-progress__eyebrow">COPITECH · DESARROLLO WEB</p>
              <h1>{proyecto.nombre}</h1>
              <span className="project-progress__status">{proyecto.estado}</span>
              {proyecto.descripcion_cliente && <p>{proyecto.descripcion_cliente}</p>}
              {proyecto.fecha_entrega && (
                <span className="project-progress__date">
                  <CalendarDays size={15} />
                  Fecha estimada: {new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' }).format(new Date(`${String(proyecto.fecha_entrega).slice(0, 10)}T00:00:00`))}
                </span>
              )}
              <div className="project-progress__meter" role="progressbar" aria-valuenow={proyecto.progreso} aria-valuemin="0" aria-valuemax="100">
                <span style={{ width: `${proyecto.progreso}%` }} />
              </div>
              <strong className="project-progress__percent">{proyecto.progreso}% completado</strong>
            </section>
            <section className="project-progress__tasks">
              <h2>Etapas del proyecto</h2>
              {proyecto.tareas.length === 0 ? (
                <p>Estamos organizando las primeras etapas de tu proyecto.</p>
              ) : (
                <ol>
                  {proyecto.tareas.map((tarea, indice) => (
                    <li key={`${tarea.titulo}-${indice}`}>
                      {tarea.estado === 'Completada' ? <CheckCircle size={18} /> : <Circle size={18} />}
                      <span>{tarea.titulo}</span>
                      <small>{tarea.estado}</small>
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <footer className="project-progress__footer">
              Este enlace es privado. Compártelo solo con las personas involucradas en este proyecto.
            </footer>
          </>
        )}
      </div>
    </main>
  );
}
