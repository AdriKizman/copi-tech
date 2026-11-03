import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, FileText, LoaderCircle, Printer } from 'lucide-react';
import { formatearBolivares, formatearUsd } from '../utils/moneda';
import './DocumentoContrato.css';

function fechaLarga(valor) {
  if (!valor) return 'No especificada';
  return new Intl.DateTimeFormat('es-VE', { dateStyle: 'long' })
    .format(new Date(`${String(valor).slice(0, 10)}T00:00:00`));
}

export default function DocumentoContrato() {
  const { id, token, pagoId } = useParams();
  const publico = Boolean(token);
  const [contrato, setContrato] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const solicitud = publico
      ? axios.get(`/api/contratos/publico/${encodeURIComponent(token)}`, { signal: controller.signal })
      : axios.get(`/api/contratos/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          signal: controller.signal,
        });
    solicitud
      .then(({ data }) => setContrato(data))
      .catch((err) => {
        if (!axios.isCancel(err)) setError(err.response?.data?.error || 'No se pudo abrir el documento.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });
    return () => controller.abort();
  }, [id, token, publico]);

  useEffect(() => {
    if (!contrato || pagoId || !new URLSearchParams(window.location.search).has('imprimir')) return;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [contrato, pagoId]);

  if (cargando) {
    return <main className="contract-document__state"><LoaderCircle size={22} /><p>Preparando documento...</p></main>;
  }
  if (!contrato) {
    return (
      <main className="contract-document__state">
        <FileText size={25} /><h1>No encontramos el documento</h1><p>{error}</p>
        {!publico && <Link to={`/contratos/${id}`}><ArrowLeft size={14} /> Volver al contrato</Link>}
      </main>
    );
  }

  const pago = pagoId ? contrato.pagos.find((item) => String(item.id) === pagoId) : null;
  if (pagoId && !pago) {
    return <main className="contract-document__state"><FileText size={25} /><h1>No encontramos este comprobante</h1></main>;
  }

  return (
    <main className="contract-document">
      <nav className="contract-document__toolbar">
        {publico
          ? <Link to="/"><ArrowLeft size={14} /> CopiTech</Link>
          : <Link to={`/contratos/${id}`}><ArrowLeft size={14} /> Volver al contrato</Link>}
        <button type="button" onClick={() => window.print()}><Printer size={15} /> Imprimir / Guardar PDF</button>
      </nav>
      <article className="contract-document__sheet">
        <header className="contract-document__brand">
          <img src="/logo_principal.png" alt="CopiTech" />
          <div><strong>CopiTech</strong><span>Servicios tecnológicos</span></div>
          <div className="contract-document__number">
            <small>{pago ? 'COMPROBANTE DE PAGO' : 'CONTRATO DE SERVICIOS'}</small>
            <strong>{pago ? `REC-${String(pago.id).padStart(6, '0')}` : contrato.codigo}</strong>
            {!pago && <span>{contrato.estado}</span>}
          </div>
        </header>

        {pago ? (
          <>
            <h1>Recibo de abono</h1>
            <p className="contract-document__intro">Comprobante de un pago asociado al contrato {contrato.codigo}.</p>
            <section className="contract-document__section">
              <h2>Datos del pago</h2>
              <dl className="contract-document__grid">
                <div><dt>Cliente</dt><dd>{contrato.cliente_nombre}</dd></div>
                <div><dt>Trabajo</dt><dd>{contrato.titulo}</dd></div>
                <div><dt>Fecha</dt><dd>{fechaLarga(pago.fecha_pago)}</dd></div>
                <div><dt>Método</dt><dd>{pago.metodo}</dd></div>
                {pago.referencia && <div><dt>Referencia</dt><dd>{pago.referencia}</dd></div>}
                <div><dt>Recibido</dt><dd>{pago.moneda === 'USD' ? formatearUsd(pago.monto) : formatearBolivares(pago.monto)}</dd></div>
                {pago.tasa_usd_ves && <div><dt>Tasa registrada</dt><dd>Bs. {Number(pago.tasa_usd_ves).toLocaleString('es-VE')} por USD</dd></div>}
                <div><dt>Equivalente registrado</dt><dd>{formatearUsd(pago.equivalente_usd)}</dd></div>
                <div><dt>Total del contrato</dt><dd>{formatearUsd(contrato.monto_total_usd)}</dd></div>
                <div><dt>Total abonado</dt><dd>{formatearUsd(contrato.total_pagado_usd)}</dd></div>
                <div><dt>Saldo actual</dt><dd>{formatearUsd(contrato.saldo_pendiente_usd)}</dd></div>
              </dl>
            </section>
            <section className="contract-document__signatures">
              <div><span>Firma del cliente</span></div>
              <div><span>Recibido por</span><strong>{contrato.prestador_nombre}</strong></div>
            </section>
          </>
        ) : (
          <>
            <h1>Acuerdo de prestación de servicios</h1>
            <p className="contract-document__intro">
              Este documento registra el alcance, el monto y las condiciones revisadas por las partes. Completa cualquier dato pendiente antes de firmarlo.
            </p>
            <section className="contract-document__section">
              <h2>Partes y servicio</h2>
              <dl className="contract-document__grid">
                <div><dt>Cliente</dt><dd>{contrato.cliente_nombre}</dd></div>
                <div><dt>Identificación / RIF</dt><dd>{contrato.cliente_identificacion || 'No registrada'}</dd></div>
                <div><dt>Teléfono</dt><dd>{contrato.cliente_telefono}</dd></div>
                <div><dt>Correo</dt><dd>{contrato.cliente_email || 'No registrado'}</dd></div>
                <div><dt>Prestador responsable</dt><dd>{contrato.prestador_nombre}</dd></div>
                <div><dt>Identificación / RIF</dt><dd>{contrato.prestador_identificacion || 'No registrada'}</dd></div>
                <div><dt>Contacto del prestador</dt><dd>{contrato.prestador_telefono || 'No registrado'}{contrato.prestador_email ? ` · ${contrato.prestador_email}` : ''}</dd></div>
                <div><dt>Tipo de servicio</dt><dd>{contrato.tipo_trabajo}</dd></div>
                <div><dt>Trabajo</dt><dd>{contrato.titulo}</dd></div>
                {contrato.codigo_seguimiento && <div><dt>Orden de reparación</dt><dd>{contrato.codigo_seguimiento} · {contrato.equipo_marca} {contrato.equipo_modelo}</dd></div>}
                {contrato.proyecto_nombre && <div><dt>Proyecto</dt><dd>{contrato.proyecto_nombre}</dd></div>}
                <div><dt>Fecha estimada de entrega</dt><dd>{fechaLarga(contrato.fecha_entrega)}</dd></div>
              </dl>
              <h3>Alcance y entregables</h3>
              <p className="contract-document__multiline">{contrato.alcance}</p>
              {contrato.falla_reportada && <><h3>Falla reportada</h3><p className="contract-document__multiline">{contrato.falla_reportada}</p></>}
            </section>
            <section className="contract-document__section">
              <h2>Monto y pagos</h2>
              <dl className="contract-document__grid">
                <div><dt>Monto acordado</dt><dd>{formatearUsd(contrato.monto_total_usd)}</dd></div>
                <div><dt>Abonado</dt><dd>{formatearUsd(contrato.total_pagado_usd)}</dd></div>
                <div><dt>Saldo pendiente</dt><dd>{formatearUsd(contrato.saldo_pendiente_usd)}</dd></div>
              </dl>
              {contrato.pagos?.length > 0 && (
                <ul className="contract-document__payments">
                  {contrato.pagos.map((movimiento, indice) => (
                    <li key={`${movimiento.fecha_pago}-${indice}`}>
                      {fechaLarga(movimiento.fecha_pago)} · {movimiento.moneda === 'USD' ? formatearUsd(movimiento.monto) : formatearBolivares(movimiento.monto)} · {movimiento.metodo}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {contrato.garantia_condiciones && (
              <section className="contract-document__section">
                <h2>Garantía y exclusiones</h2>
                <p className="contract-document__multiline">{contrato.garantia_condiciones}</p>
              </section>
            )}
            <section className="contract-document__section">
              <h2>Condiciones acordadas</h2>
              <p className="contract-document__multiline">{contrato.condiciones}</p>
            </section>
            {(contrato.tracking_token || contrato.proyecto_tracking_token) && (
              <section className="contract-document__tracking">
                <div>
                  <h2>{contrato.tracking_token ? 'Seguimiento de reparación' : 'Avance del proyecto'}</h2>
                  <p>{contrato.tracking_token
                    ? 'Escanea el QR para consultar el estado actualizado de la reparación.'
                    : 'Escanea el QR para consultar las etapas y el avance actualizado del proyecto.'}</p>
                </div>
                <img
                  src={contrato.tracking_token
                    ? `/api/ordenes/qr/${contrato.tracking_token}?format=png`
                    : `/api/proyectos-web/qr/${contrato.proyecto_tracking_token}`}
                  alt="QR privado de seguimiento"
                />
              </section>
            )}
            <section className="contract-document__signatures">
              <div><span>Firma del cliente</span><small>{contrato.cliente_nombre}</small></div>
              <div><span>Firma del prestador</span><small>{contrato.prestador_nombre}</small></div>
            </section>
            <p className="contract-document__legal-note">
              Documento editable preparado por CopiTech. Las partes deben revisar sus datos y condiciones, y solicitar asesoría legal local antes de usarlo como acuerdo vinculante.
            </p>
          </>
        )}
        <footer className="contract-document__footer">
          CopiTech · {contrato.prestador_telefono || ''} {contrato.prestador_email || ''}
        </footer>
      </article>
    </main>
  );
}
