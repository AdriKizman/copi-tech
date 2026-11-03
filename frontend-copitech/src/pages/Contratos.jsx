import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, FileText, Plus, Search } from 'lucide-react';
import MontoDual from '../components/MontoDual';
import './Contratos.css';

const condicionesBase = `1. El servicio se limita al alcance y los entregables descritos en este documento.
2. Todo trabajo o cambio fuera del alcance requiere aprobación previa y puede modificar precio y fecha.
3. Las partes acuerdan las fechas y forma de pago indicadas; cada abono se registrará con su moneda, método y tasa aplicada.
4. El cliente facilitará a tiempo la información, accesos y aprobaciones necesarios. No se deben compartir contraseñas personales por canales inseguros.
5. Si el trabajo requiere una pausa por falta de información, materiales o aprobaciones, las partes revisarán la fecha de entrega.
6. La garantía, sus condiciones y exclusiones solo aplican cuando estén descritas expresamente en este contrato.
7. Las partes revisarán y firmarán este documento antes de iniciar. Este texto es una base editable y debe ser revisado para cumplir la normativa aplicable.`;

const fechaHoy = () => {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${valores.year}-${valores.month}-${valores.day}`;
};

const formVacio = () => {
  let nombre = '';
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    nombre = typeof usuario.nombre === 'string' ? usuario.nombre : '';
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }
  return {
    cliente_id: '',
    orden_id: '',
    proyecto_web_id: '',
    solicitud_id: '',
    tipo_trabajo: 'Servicio general',
    titulo: '',
    alcance: '',
    condiciones: condicionesBase,
    garantia_condiciones: '',
    fecha_entrega: '',
    monto_total_usd: '',
    prestador_nombre: nombre,
    prestador_identificacion: '',
    prestador_direccion: '',
    prestador_telefono: '',
    prestador_email: '',
  };
};

function relacionCliente(registro, id) {
  return Number(registro?.cliente_id) === Number(id);
}

export default function Contratos() {
  const navigate = useNavigate();
  const [contratos, setContratos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [form, setForm] = useState(formVacio);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [formAbierto, setFormAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    Promise.all([
      axios.get('/api/contratos', { headers, signal: controller.signal }),
      axios.get('/api/clientes?limit=100', { headers, signal: controller.signal }),
      axios.get('/api/ordenes?limit=100', { headers, signal: controller.signal }),
      axios.get('/api/proyectos-web', { headers, signal: controller.signal }),
      axios.get('/api/solicitudes?limit=100&page=1', { headers, signal: controller.signal }),
    ])
      .then(([contratosRespuesta, clientesRespuesta, ordenesRespuesta, proyectosRespuesta, solicitudesRespuesta]) => {
        setContratos(contratosRespuesta.data.contratos);
        setClientes(clientesRespuesta.data.clientes);
        setOrdenes(ordenesRespuesta.data.ordenes);
        setProyectos(proyectosRespuesta.data.proyectos);
        setSolicitudes(solicitudesRespuesta.data.solicitudes.filter((solicitud) => solicitud.estado === 'Aceptada'));
        setError('');
      })
      .catch((err) => {
        if (axios.isCancel(err)) return;
        if (err.response?.status === 401) {
          setError(`La API rechazó la sesión al cargar los datos (${err.response.data?.error || 'HTTP 401'}). La sesión local se conservó; vuelve a iniciar sesión solo si el problema persiste.`);
          return;
        }
        setError(err.response?.data?.error || 'No se pudieron cargar los datos para contratos.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });
    return () => controller.abort();
  }, [navigate]);

  const seleccionarSolicitud = (id) => {
    const solicitud = solicitudes.find((item) => String(item.id) === id);
    if (!solicitud) {
      setForm((actual) => ({ ...actual, solicitud_id: '' }));
      return;
    }
    const reparacion = /reparaci|equipo/i.test(solicitud.servicio);
    setForm((actual) => ({
      ...actual,
      solicitud_id: id,
      cliente_id: String(solicitud.cliente_id || ''),
      tipo_trabajo: reparacion ? 'Reparación' : 'Servicio general',
      orden_id: '',
      proyecto_web_id: '',
      titulo: solicitud.servicio,
      alcance: solicitud.mensaje,
    }));
  };

  const seleccionarOrden = (id) => {
    const orden = ordenes.find((item) => String(item.id) === id);
    setForm((actual) => ({
      ...actual,
      orden_id: id,
      proyecto_web_id: '',
      cliente_id: orden ? String(orden.cliente_id) : actual.cliente_id,
      tipo_trabajo: 'Reparación',
      titulo: orden ? `Reparación ${orden.equipo_marca} ${orden.equipo_modelo}` : actual.titulo,
      alcance: orden
        ? `Diagnóstico y servicio para ${orden.equipo_marca} ${orden.equipo_modelo}. Falla reportada: ${orden.falla_reportada}`
        : actual.alcance,
      monto_total_usd: orden?.presupuesto ?? actual.monto_total_usd,
    }));
  };

  const seleccionarProyecto = (id) => {
    const proyecto = proyectos.find((item) => String(item.id) === id);
    setForm((actual) => ({
      ...actual,
      proyecto_web_id: id,
      orden_id: '',
      cliente_id: proyecto ? String(proyecto.cliente_id) : actual.cliente_id,
      tipo_trabajo: 'Proyecto web',
      titulo: proyecto?.nombre || actual.titulo,
      alcance: proyecto?.descripcion_cliente || actual.alcance,
      fecha_entrega: proyecto?.fecha_entrega ? String(proyecto.fecha_entrega).slice(0, 10) : actual.fecha_entrega,
    }));
  };

  const cambiarCampo = (evento) => {
    const { name, value } = evento.target;
    if (name === 'orden_id') {
      seleccionarOrden(value);
    } else if (name === 'proyecto_web_id') {
      seleccionarProyecto(value);
    } else if (name === 'solicitud_id') {
      seleccionarSolicitud(value);
    } else {
      setForm((actual) => ({ ...actual, [name]: value }));
    }
  };

  const crearContrato = async (evento) => {
    evento.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const { data } = await axios.post('/api/contratos', form, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setForm(formVacio());
      setFormAbierto(false);
      navigate(`/contratos/${data.id}`);
    } catch (err) {
      if (err.response?.status === 401) {
        setError(`La API rechazó la sesión al guardar el contrato (${err.response.data?.error || 'HTTP 401'}). No se borró tu sesión.`);
      } else {
        setError(err.response?.data?.error || 'No se pudo crear el contrato.');
      }
    } finally {
      setGuardando(false);
    }
  };

  const contratosFiltrados = contratos.filter((contrato) =>
    `${contrato.codigo} ${contrato.titulo} ${contrato.cliente_nombre}`
      .toLocaleLowerCase('es').includes(busqueda.trim().toLocaleLowerCase('es'))
  );
  const requiereOrden = form.tipo_trabajo === 'Reparación';
  const requiereProyecto = form.tipo_trabajo === 'Proyecto web';

  return (
    <main className="admin-page contracts-page">
      <header className="admin-page__heading">
        <div>
          <p className="admin-page__eyebrow">ACUERDOS Y CUENTAS POR COBRAR</p>
          <h1>Contratos y pagos</h1>
          <p>Prepara contratos, registra abonos y consulta los saldos de cada trabajo.</p>
        </div>
        <button className="admin-page__primary-button" type="button" onClick={() => setFormAbierto((actual) => !actual)}>
          <Plus size={15} /> Nuevo contrato
        </button>
      </header>

      {error && <div className="admin-page__error" role="alert">{error}</div>}

      {formAbierto && (
        <form className="contract-form" onSubmit={crearContrato}>
          <h2><FileText size={17} /> Datos del contrato</h2>
          <p className="contract-form__notice">
            Texto base editable para revisión: no sustituye la asesoría legal. Completa los datos de quien presta el servicio y revisa el documento antes de enviarlo.
          </p>
          <label className="contract-form__full">
            Solicitud web aceptada (opcional)
            <select name="solicitud_id" value={form.solicitud_id} onChange={cambiarCampo}>
              <option value="">Sin solicitud web</option>
              {solicitudes.map((solicitud) => (
                <option key={solicitud.id} value={solicitud.id}>
                  {solicitud.nombre} · {solicitud.servicio}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cliente
            <select name="cliente_id" value={form.cliente_id} onChange={cambiarCampo} required>
              <option value="">Selecciona un cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>{cliente.nombre} · {cliente.telefono}</option>
              ))}
            </select>
          </label>
          <label>
            Tipo de trabajo
            <select
              name="tipo_trabajo"
              value={form.tipo_trabajo}
              onChange={(evento) => setForm((actual) => ({
                ...actual,
                tipo_trabajo: evento.target.value,
                orden_id: '',
                proyecto_web_id: '',
              }))}
            >
              <option>Reparación</option>
              <option>Proyecto web</option>
              <option>Servicio general</option>
            </select>
          </label>
          {requiereOrden && (
            <label>
              Orden de reparación
              <select name="orden_id" value={form.orden_id} onChange={cambiarCampo} required>
                <option value="">Selecciona la orden</option>
                {ordenes.filter((orden) => relacionCliente(orden, form.cliente_id)).map((orden) => (
                  <option key={orden.id} value={orden.id}>
                    {orden.codigo_seguimiento} · {orden.equipo_marca} {orden.equipo_modelo}
                  </option>
                ))}
              </select>
            </label>
          )}
          {requiereProyecto && (
            <label>
              Proyecto web
              <select name="proyecto_web_id" value={form.proyecto_web_id} onChange={cambiarCampo} required>
                <option value="">Selecciona el proyecto</option>
                {proyectos.filter((proyecto) => relacionCliente(proyecto, form.cliente_id)).map((proyecto) => (
                  <option key={proyecto.id} value={proyecto.id}>{proyecto.nombre}</option>
                ))}
              </select>
            </label>
          )}
          <label className="contract-form__full">
            Nombre del trabajo
            <input name="titulo" value={form.titulo} onChange={cambiarCampo} maxLength="160" required />
          </label>
          <label className="contract-form__full">
            Alcance y entregables
            <textarea name="alcance" value={form.alcance} onChange={cambiarCampo} maxLength="8000" rows="4" required />
          </label>
          <label>
            Monto acordado (USD)
            <input name="monto_total_usd" type="number" min="0.01" step="0.01" value={form.monto_total_usd} onChange={cambiarCampo} required />
          </label>
          <label>
            Fecha estimada de entrega
            <input name="fecha_entrega" type="date" min={fechaHoy()} value={form.fecha_entrega} onChange={cambiarCampo} />
          </label>
          <label className="contract-form__full">
            Condiciones acordadas / pagos / cambios / cancelación
            <textarea name="condiciones" value={form.condiciones} onChange={cambiarCampo} maxLength="8000" rows="7" required />
          </label>
          <label className="contract-form__full">
            Garantía y exclusiones (si aplica)
            <textarea name="garantia_condiciones" value={form.garantia_condiciones} onChange={cambiarCampo} maxLength="3000" rows="2" placeholder="Indica duración, cobertura y exclusiones, o déjalo vacío." />
          </label>
          <h3 className="contract-form__full">Datos de quien prestará el servicio</h3>
          <label>
            Nombre del técnico / programador
            <input name="prestador_nombre" value={form.prestador_nombre} onChange={cambiarCampo} maxLength="150" required />
          </label>
          <label>
            Identificación / RIF
            <input name="prestador_identificacion" value={form.prestador_identificacion} onChange={cambiarCampo} maxLength="80" />
          </label>
          <label>
            Teléfono de contacto
            <input name="prestador_telefono" value={form.prestador_telefono} onChange={cambiarCampo} maxLength="30" />
          </label>
          <label>
            Correo
            <input type="email" name="prestador_email" value={form.prestador_email} onChange={cambiarCampo} maxLength="150" />
          </label>
          <label className="contract-form__full">
            Dirección
            <input name="prestador_direccion" value={form.prestador_direccion} onChange={cambiarCampo} maxLength="255" />
          </label>
          <footer className="contract-form__actions contract-form__full">
            <button type="submit" className="admin-page__primary-button" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Crear borrador de contrato'}
            </button>
            <button type="button" className="admin-page__secondary-button" onClick={() => setFormAbierto(false)}>
              Cancelar
            </button>
          </footer>
        </form>
      )}

      <section className="admin-page__panel">
        <div className="admin-page__toolbar">
          <label className="admin-page__search">
            <Search size={16} />
            <input value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar contrato, trabajo o cliente" aria-label="Buscar contratos" />
          </label>
        </div>
        {cargando ? (
          <div className="admin-page__state"><FileText size={22} /><p>Cargando contratos...</p></div>
        ) : contratosFiltrados.length === 0 ? (
          <div className="admin-page__state">
            <FileText size={22} />
            <strong>No hay contratos para mostrar</strong>
            <p>Crea un contrato para una reparación, proyecto web o servicio general.</p>
          </div>
        ) : (
          <div className="admin-page__table-wrap">
            <table className="admin-page__table">
              <thead>
                <tr><th>Contrato / cliente</th><th>Estado</th><th>Total</th><th>Abonado</th><th>Saldo</th><th /></tr>
              </thead>
              <tbody>
                {contratosFiltrados.map((contrato) => (
                  <tr key={contrato.id}>
                    <td>
                      <Link to={`/contratos/${contrato.id}`}><strong>{contrato.codigo} · {contrato.titulo}</strong></Link>
                      <small>{contrato.cliente_nombre} · {contrato.tipo_trabajo}</small>
                    </td>
                    <td>{contrato.estado}</td>
                    <td><MontoDual monto={contrato.monto_total_usd} /></td>
                    <td><MontoDual monto={contrato.total_pagado_usd} /></td>
                    <td><MontoDual monto={contrato.saldo_pendiente_usd} /></td>
                    <td><Link to={`/contratos/${contrato.id}`}>Administrar <ArrowRight size={13} /></Link></td>
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
