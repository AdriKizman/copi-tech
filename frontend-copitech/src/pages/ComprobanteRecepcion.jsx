import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ClipboardCheck, LoaderCircle, Printer } from 'lucide-react';
import './DocumentoContrato.css';

function fechaBonita(valor) {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '—';
  return new Intl.DateTimeFormat('es-VE', { dateStyle: 'long', timeStyle: 'short' }).format(fecha);
}

export default function ComprobanteRecepcion() {
  const { id } = useParams();
  const [orden, setOrden] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    axios.get(`/api/ordenes/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      signal: controller.signal,
    })
      .then(({ data }) => setOrden(data))
      .catch((err) => {
        if (!axios.isCancel(err)) setError(err.response?.data?.error || 'No se pudo abrir el comprobante.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!orden || !new URLSearchParams(window.location.search).has('imprimir')) return;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [orden]);

  if (cargando) return <main className="contract-document__state"><LoaderCircle size={22} /><p>Preparando comprobante...</p></main>;
  if (!orden) return <main className="contract-document__state"><ClipboardCheck size={25} /><h1>No encontramos esta orden</h1><p>{error}</p></main>;

  return (
    <main className="contract-document">
      <nav className="contract-document__toolbar">
        <Link to={`/ordenes/${id}`}><ArrowLeft size={14} /> Volver a la orden</Link>
        <button type="button" onClick={() => window.print()}><Printer size={15} /> Imprimir / Guardar PDF</button>
      </nav>
      <article className="contract-document__sheet">
        <header className="contract-document__brand">
          <img src="/logo_principal.png" alt="CopiTech" />
          <div><strong>CopiTech</strong><span>Constancia de recepción</span></div>
          <div className="contract-document__number">
            <small>COMPROBANTE DE RECEPCIÓN</small>
            <strong>{orden.codigo_seguimiento}</strong>
          </div>
        </header>
        <h1>Constancia de recepción de equipo</h1>
        <p className="contract-document__intro">Se deja constancia de la recepción del equipo y de los accesorios descritos a continuación.</p>
        <section className="contract-document__section">
          <h2>Cliente y recepción</h2>
          <dl className="contract-document__grid">
            <div><dt>Cliente</dt><dd>{orden.cliente_nombre}</dd></div>
            <div><dt>Teléfono</dt><dd>{orden.cliente_telefono || 'No registrado'}</dd></div>
            <div><dt>Correo</dt><dd>{orden.cliente_email || 'No registrado'}</dd></div>
            <div><dt>Fecha y hora</dt><dd>{fechaBonita(orden.fecha_ingreso)}</dd></div>
          </dl>
        </section>
        <section className="contract-document__section">
          <h2>Equipo entregado</h2>
          <dl className="contract-document__grid">
            {orden.tipo_equipo && <div><dt>Tipo</dt><dd>{orden.tipo_equipo}</dd></div>}
            <div><dt>Marca</dt><dd>{orden.equipo_marca}</dd></div>
            <div><dt>Modelo</dt><dd>{orden.equipo_modelo}</dd></div>
            <div><dt>Serie / IMEI</dt><dd>{orden.numero_serie || 'No registrado'}</dd></div>
            <div><dt>Estado actual de la orden</dt><dd>{orden.estado}</dd></div>
            <div><dt>Presupuesto registrado</dt><dd>{orden.presupuesto === null ? 'Por definir' : `$${Number(orden.presupuesto).toFixed(2)} USD`}</dd></div>
          </dl>
          <h3>Falla reportada por el cliente</h3>
          <p className="contract-document__multiline">{orden.falla_reportada}</p>
          <h3>Estado físico y observaciones</h3>
          <p className="contract-document__multiline">{orden.condicion_recepcion || 'Sin observaciones físicas registradas.'}</p>
          <h3>Accesorios recibidos</h3>
          <p className="contract-document__multiline">{orden.accesorios_recepcion || 'No se recibieron accesorios junto con el equipo.'}</p>
          {orden.observaciones_recepcion && (
            <>
              <h3>Observaciones de recepción</h3>
              <p className="contract-document__multiline">{orden.observaciones_recepcion}</p>
            </>
          )}
        </section>
        {orden.tracking_token && (
          <section className="contract-document__tracking">
            <div><h2>Seguimiento</h2><p>Escanea el QR para consultar el estado actualizado de la reparación.</p></div>
            <img src={`/api/ordenes/qr/${orden.tracking_token}?format=png`} alt="QR privado de seguimiento" />
          </section>
        )}
        <section className="contract-document__signatures">
          <div><span>Firma del cliente al entregar</span><small>{orden.cliente_nombre}</small></div>
          <div><span>Recibido por CopiTech</span><small>{orden.tecnico_nombre || 'Responsable del servicio'}</small></div>
        </section>
        <p className="contract-document__legal-note">Esta constancia registra los datos anotados al momento de recibir el equipo. El diagnóstico y cualquier trabajo adicional se informarán al cliente para su aprobación.</p>
      </article>
    </main>
  );
}
