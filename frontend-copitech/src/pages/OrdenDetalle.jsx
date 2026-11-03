import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Check, ClipboardCheck, ClipboardList, ExternalLink, LoaderCircle, Phone, QrCode, Save } from 'lucide-react';
import './AdminPages.css';
import MontoDual from '../components/MontoDual';

function formatoFecha(fecha) {
  const parsed = fecha ? new Date(fecha) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? new Intl.DateTimeFormat('es-VE', { dateStyle: 'long', timeStyle: 'short' }).format(parsed)
    : 'Sin fecha';
}

export default function OrdenDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [orden, setOrden] = useState(null);
  const [form, setForm] = useState({
    diagnostico: '',
    presupuesto: '',
    notas: '',
    tipo_equipo: '',
    condicion_recepcion: '',
    accesorios_recepcion: '',
    observaciones_recepcion: '',
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [guardado, setGuardado] = useState(false);
  const [enlaceActualizado, setEnlaceActualizado] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    axios
      .get(`/api/ordenes/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        signal: controller.signal,
      })
      .then(({ data }) => {
        setOrden(data);
        setForm({
          diagnostico: data.diagnostico || '',
          presupuesto: data.presupuesto ?? '',
          notas: data.notas || '',
          tipo_equipo: data.tipo_equipo || '',
          condicion_recepcion: data.condicion_recepcion || '',
          accesorios_recepcion: data.accesorios_recepcion || '',
          observaciones_recepcion: data.observaciones_recepcion || '',
        });
      })
      .catch((err) => {
        if (!axios.isCancel(err)) setError(err.response?.data?.error || 'No se pudo cargar la orden.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });

    return () => controller.abort();
  }, [id]);

  const guardar = async (evento) => {
    evento.preventDefault();
    setGuardando(true);
    setError('');
    setGuardado(false);
    setEnlaceActualizado(false);
    try {
      const { data } = await axios.put(
        `/api/ordenes/${id}`,
        {
          diagnostico: form.diagnostico,
          presupuesto: form.presupuesto === '' ? null : Number(form.presupuesto),
          notas: form.notas,
          tipo_equipo: form.tipo_equipo,
          condicion_recepcion: form.condicion_recepcion,
          accesorios_recepcion: form.accesorios_recepcion,
          observaciones_recepcion: form.observaciones_recepcion,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } },
      );
      setOrden(data);
      setForm({
        diagnostico: data.diagnostico || '',
        presupuesto: data.presupuesto ?? '',
        notas: data.notas || '',
        tipo_equipo: data.tipo_equipo || '',
        condicion_recepcion: data.condicion_recepcion || '',
        accesorios_recepcion: data.accesorios_recepcion || '',
        observaciones_recepcion: data.observaciones_recepcion || '',
      });
      setGuardado(true);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron guardar los cambios.');
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (estado) => {
    setGuardando(true);
    setError('');
    setGuardado(false);
    setEnlaceActualizado(false);
    try {
      const { data } = await axios.patch(
        `/api/ordenes/${id}/estado`,
        { estado },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } },
      );
      setOrden(data);
      setGuardado(true);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cambiar el estado.');
    } finally {
      setGuardando(false);
    }
  };

  const renovarEnlaceSeguimiento = async () => {
    if (
      orden.tracking_token &&
      !window.confirm('El enlace actual dejará de funcionar. ¿Quieres generar uno nuevo?')
    ) {
      return;
    }

    setGuardando(true);
    setError('');
    setGuardado(false);
    setEnlaceActualizado(false);
    try {
      const { data } = await axios.post(
        `/api/ordenes/${id}/token-seguimiento`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } },
      );
      setOrden(data);
      setGuardado(true);
      setEnlaceActualizado(true);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        navigate('/admin');
        return;
      }
      setError(err.response?.data?.error || 'No se pudo renovar el enlace privado.');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return <main className="admin-page"><div className="admin-page__panel admin-page__state"><ClipboardList size={22} /><p>Cargando orden...</p></div></main>;
  }

  if (!orden) {
    return (
      <main className="admin-page">
        <Link className="admin-page__secondary-button" to="/ordenes"><ArrowLeft size={15} /> Volver a órdenes</Link>
        <div className="admin-page__panel admin-page__state"><ClipboardList size={22} /><strong>No encontramos esta orden</strong><p>{error}</p></div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-page__heading">
        <div>
          <Link className="admin-page__back-link" to="/ordenes"><ArrowLeft size={14} /> Todas las órdenes</Link>
          <p className="admin-page__eyebrow">ORDEN {orden.codigo_seguimiento}</p>
          <h1>{orden.equipo_marca} {orden.equipo_modelo}</h1>
          <p>Ingresó el {formatoFecha(orden.fecha_ingreso)}</p>
        </div>
        <div className="admin-page__heading-actions">
          {orden.tracking_token ? (
            <>
              <a
                className="admin-page__secondary-button"
                href={`/api/ordenes/qr/${encodeURIComponent(orden.tracking_token)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <QrCode size={15} /> Imprimir QR
                <ExternalLink size={13} />
              </a>
              <a
                className="admin-page__secondary-button"
                href={`/seguimiento/${encodeURIComponent(orden.tracking_token)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={14} /> Ver enlace privado
              </a>
            </>
          ) : null}
          <button
            className="admin-page__secondary-button"
            type="button"
            onClick={renovarEnlaceSeguimiento}
            disabled={guardando}
          >
            <QrCode size={15} /> {orden.tracking_token ? 'Renovar enlace' : 'Generar enlace privado'}
          </button>
          {orden.cliente_telefono && (
            <a className="admin-page__secondary-button" href={`tel:${orden.cliente_telefono}`}>
              <Phone size={15} /> Contactar cliente
            </a>
          )}
          <Link className="admin-page__secondary-button" to={`/ordenes/${id}/comprobante-recepcion?imprimir=1`} target="_blank">
            <ClipboardCheck size={15} /> Comprobante de recepción
          </Link>
        </div>
      </header>

      {location.state?.creada && (
        <div className="admin-page__success" role="status">
          <Check size={15} />
          Orden {location.state.codigo || orden.codigo_seguimiento} registrada correctamente.
          {location.state.clienteReutilizado && ' El teléfono ya estaba registrado; vinculamos la orden con ese cliente.'}
        </div>
      )}
      {error && <div className="admin-page__error" role="alert">{error}</div>}
      {guardado && (
        <div className="admin-page__success" role="status">
          <Check size={15} />
          {enlaceActualizado
            ? 'Enlace privado listo. Si lo renovaste, comparte el nuevo enlace con el cliente.'
            : 'Cambios guardados correctamente.'}
        </div>
      )}

      <div className="admin-page__detail-grid">
        <section className="admin-page__panel admin-page__detail-card">
          <div className="admin-page__detail-heading">
            <div><p className="admin-page__eyebrow">INFORMACIÓN DEL CLIENTE</p><h2>{orden.cliente_nombre}</h2></div>
            <Link to={`/clientes/${orden.cliente_id}`}>Ver historial</Link>
          </div>
          <dl className="admin-page__definition-list">
            <div><dt>Teléfono</dt><dd>{orden.cliente_telefono || 'No registrado'}</dd></div>
            <div><dt>Correo</dt><dd>{orden.cliente_email || 'No registrado'}</dd></div>
            <div><dt>Técnico</dt><dd>{orden.tecnico_nombre || 'Sin asignar'}</dd></div>
            <div><dt>Número de serie</dt><dd>{orden.numero_serie || 'No registrado'}</dd></div>
          </dl>
          <div className="admin-page__reported">
            <span>FALLA REPORTADA</span>
            <p>{orden.falla_reportada}</p>
          </div>
        </section>

        <section className="admin-page__panel admin-page__detail-card">
          <div className="admin-page__detail-heading">
            <div><p className="admin-page__eyebrow">SEGUIMIENTO</p><h2>Estado de reparación</h2></div>
            <span className={`admin-page__badge admin-page__badge--${orden.estado === 'Listo' ? 'green' : orden.estado === 'Entregado' ? 'slate' : ''}`}>{orden.estado}</span>
          </div>
          <label className="admin-page__single-field">
            Cambiar estado
            <select value={orden.estado} disabled={guardando} onChange={(evento) => cambiarEstado(evento.target.value)}>
              {['Recibido', 'En Diagnóstico', 'Esperando Repuesto', 'Listo', 'Entregado'].map((estado) => (
                <option key={estado} value={estado}>{estado}</option>
              ))}
            </select>
          </label>
          <div className="admin-page__order-dates">
            <span>Última actualización <strong>{formatoFecha(orden.actualizado_en || orden.fecha_ingreso)}</strong></span>
            {orden.fecha_entrega && <span>Entregado <strong>{formatoFecha(orden.fecha_entrega)}</strong></span>}
          </div>
        </section>
      </div>

      <section className="admin-page__panel admin-page__edit-panel">
        <div className="admin-page__detail-heading">
          <div><p className="admin-page__eyebrow">REGISTRO DE LA ORDEN</p><h2>Recepción, diagnóstico y notas</h2></div>
        </div>
        <form className="admin-page__form" onSubmit={guardar}>
          <label>
            Tipo de equipo
            <input maxLength="50" value={form.tipo_equipo} onChange={(evento) => setForm({ ...form, tipo_equipo: evento.target.value })} placeholder="Celular, computador, tablet..." />
          </label>
          <label>
            Accesorios recibidos
            <input maxLength="1000" value={form.accesorios_recepcion} onChange={(evento) => setForm({ ...form, accesorios_recepcion: evento.target.value })} placeholder="Cargador, estuche..." />
          </label>
          <label className="admin-page__form-full">
            Condición física al recibir
            <textarea maxLength="1000" rows="2" value={form.condicion_recepcion} onChange={(evento) => setForm({ ...form, condicion_recepcion: evento.target.value })} placeholder="Daños visibles y estado del equipo..." />
          </label>
          <label className="admin-page__form-full">
            Observaciones de recepción
            <textarea maxLength="2000" rows="2" value={form.observaciones_recepcion} onChange={(evento) => setForm({ ...form, observaciones_recepcion: evento.target.value })} placeholder="Observaciones que aparecerán en el comprobante del cliente..." />
          </label>
          <label className="admin-page__form-full">
            Diagnóstico
            <textarea maxLength="5000" rows="4" value={form.diagnostico} onChange={(evento) => setForm({ ...form, diagnostico: evento.target.value })} placeholder="Describe la causa del problema y el trabajo recomendado..." />
          </label>
          <label>
            Presupuesto (USD)
            <input min="0" step="0.01" type="number" value={form.presupuesto} onChange={(evento) => setForm({ ...form, presupuesto: evento.target.value })} placeholder="Por definir" />
            {form.presupuesto !== '' && <MontoDual monto={form.presupuesto} />}
          </label>
          <label className="admin-page__form-full">
            Notas internas
            <textarea maxLength="5000" rows="4" value={form.notas} onChange={(evento) => setForm({ ...form, notas: evento.target.value })} placeholder="Anota repuestos, acuerdos o detalles para el equipo..." />
          </label>
          <div className="admin-page__form-actions">
            <button className="admin-page__secondary-button" type="button" onClick={() => navigate('/ordenes')}>Volver</button>
            <button className="admin-page__primary-button" type="submit" disabled={guardando}>
              {guardando ? <LoaderCircle className="admin-page__spinner" size={15} /> : <Save size={15} />}
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
