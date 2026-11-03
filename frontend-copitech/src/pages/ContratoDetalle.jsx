import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Check,
  CircleDollarSign,
  ExternalLink,
  FileCheck2,
  FileText,
  MessageCircle,
  Printer,
  ReceiptText,
} from 'lucide-react';
import MontoDual from '../components/MontoDual';
import { formatearBolivares, formatearUsd } from '../utils/moneda';
import './Contratos.css';

function fechaHoy() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${valores.year}-${valores.month}-${valores.day}`;
}

function telefonoWhatsApp(telefono) {
  const digitos = telefono.replace(/\D/g, '');
  return digitos.startsWith('0') ? `58${digitos.slice(1)}` : digitos;
}

function fechaBonita(valor) {
  if (!valor) return '—';
  return new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' })
    .format(new Date(`${String(valor).slice(0, 10)}T00:00:00`));
}

export default function ContratoDetalle() {
  const { id } = useParams();
  const [contrato, setContrato] = useState(null);
  const [tasaActual, setTasaActual] = useState('');
  const [pago, setPago] = useState({
    monto: '',
    moneda: 'USD',
    tasa_usd_ves: '',
    metodo: 'Efectivo',
    referencia: '',
    fecha_pago: fechaHoy(),
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarContrato = useCallback(async (signal) => {
    const { data } = await axios.get(`/api/contratos/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      signal,
    });
    setContrato(data);
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    axios.get(`/api/contratos/${id}`, {
      headers: { Authorization: `******'token')}` },
      signal: controller.signal,
    })
      .then(({ data }) => setContrato(data))
      .catch((err) => {
        if (axios.isCancel(err)) return;
        if (err.response?.status === 401) {
          setError(`La API rechazó la sesión al abrir este contrato (${err.response.data?.error || 'HTTP 401'}). La sesión local se conservó.`);
          return;
        }
        setError(err.response?.data?.error || 'No se pudo cargar el contrato.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });
    axios.get('/api/tasa-cambio', { signal: controller.signal })
      .then(({ data }) => {
        const tasa = data.tasa?.usd_ves ? String(data.tasa.usd_ves) : '';
        setTasaActual(tasa);
        setPago((actual) => ({ ...actual, tasa_usd_ves: tasa }));
      })
      .catch((err) => {
        if (!axios.isCancel(err) && err.response?.status === 401) {
          setError('No se pudo consultar la tasa BCV. Puedes introducir manualmente la tasa aplicada al pago.');
        }
      });
    return () => controller.abort();
  }, [id]);

  const cambiarEstado = async (estado) => {
    const confirmacion = estado === 'Aceptado'
      ? 'Confirma que el cliente firmó o aceptó este contrato.'
      : estado === 'Cancelado'
        ? '¿Quieres cancelar este contrato?'
        : '';
    if (confirmacion && !window.confirm(confirmacion)) return;
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const { data } = await axios.patch(`/api/contratos/${id}/estado`, { estado }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setContrato((actual) => ({ ...actual, ...data }));
      setMensaje(estado === 'Enviado' ? 'El contrato quedó marcado como enviado.' : `El contrato quedó marcado como ${estado.toLowerCase()}.`);
    } catch (err) {
      if (err.response?.status === 401) {
        setError(`La API rechazó la sesión al actualizar el contrato (${err.response.data?.error || 'HTTP 401'}). No se borró tu sesión.`);
      } else {
        setError(err.response?.data?.error || 'No se pudo actualizar el estado del contrato.');
      }
    } finally {
      setGuardando(false);
    }
  };

  const registrarPago = async (evento) => {
    evento.preventDefault();
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      await axios.post(`/api/contratos/${id}/pagos`, pago, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      await cargarContrato();
      setMensaje('Abono registrado. Ya puedes imprimir su comprobante.');
      setPago((actual) => ({ ...actual, monto: '', referencia: '', fecha_pago: fechaHoy() }));
    } catch (err) {
      if (err.response?.status === 401) {
        setError(`La API rechazó la sesión al registrar el pago (${err.response.data?.error || 'HTTP 401'}). No se borró tu sesión.`);
      } else {
        setError(err.response?.data?.error || 'No se pudo registrar el pago.');
      }
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return <main className="admin-page"><div className="admin-page__panel admin-page__state"><FileText size={22} /><p>Cargando contrato...</p></div></main>;
  }
  if (!contrato) {
    return (
      <main className="admin-page">
        <Link className="admin-page__secondary-button" to="/contratos"><ArrowLeft size={15} /> Volver a contratos</Link>
        <div className="admin-page__panel admin-page__state"><FileText size={22} /><strong>No encontramos el contrato</strong><p>{error}</p></div>
      </main>
    );
  }

  const equivalenciaUsd = pago.monto
    ? Number(pago.moneda === 'USD' ? pago.monto : Number(pago.monto) / Number(pago.tasa_usd_ves || 0))
    : 0;
  const urlContrato = `${window.location.origin}/contrato/${contrato.token_publico}`;
  const urlSeguimiento = contrato.tracking_token
    ? `${window.location.origin}/seguimiento/${contrato.tracking_token}`
    : contrato.proyecto_tracking_token
      ? `${window.location.origin}/proyecto/${contrato.proyecto_tracking_token}`
      : '';
  const mensajeWhatsApp = `Hola ${contrato.cliente_nombre}, te compartimos el contrato ${contrato.codigo} de CopiTech (${contrato.titulo}). Puedes revisar el documento aquí: ${urlContrato}${urlSeguimiento ? `\nSeguimiento de reparación: ${urlSeguimiento}` : ''}\nTambién te compartiré el PDF por este chat para que puedas guardarlo o imprimirlo para la firma manual.`;
  const enlaceWhatsApp = contrato.cliente_telefono
    ? `https://wa.me/${telefonoWhatsApp(contrato.cliente_telefono)}?text=${encodeURIComponent(mensajeWhatsApp)}`
    : '';

  return (
    <main className="admin-page contract-detail">
      <header className="admin-page__heading">
        <div>
          <Link className="admin-page__back-link" to="/contratos"><ArrowLeft size={14} /> Contratos y pagos</Link>
          <p className="admin-page__eyebrow">{contrato.codigo} · {contrato.tipo_trabajo}</p>
          <h1>{contrato.titulo}</h1>
          <p>{contrato.cliente_nombre} · {contrato.estado} · Entrega estimada: {fechaBonita(contrato.fecha_entrega)}</p>
        </div>
      </header>

      {error && <div className="admin-page__error" role="alert">{error}</div>}
      {mensaje && <div className="admin-page__success" role="status"><Check size={15} /> {mensaje}</div>}

      <div className="contract-detail__actions">
        <Link className="admin-page__secondary-button" to={`/contratos/${id}/imprimir?imprimir=1`} target="_blank">
          <Printer size={15} /> Imprimir / Guardar PDF
        </Link>
        <a className="admin-page__secondary-button" href={urlContrato} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={14} /> Vista del cliente
        </a>
        {enlaceWhatsApp && (
          <a className="admin-page__primary-button" href={enlaceWhatsApp} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={15} /> Preparar WhatsApp
          </a>
        )}
        {contrato.estado === 'Borrador' && (
          <button className="admin-page__secondary-button" type="button" disabled={guardando} onClick={() => cambiarEstado('Enviado')}>
            <FileCheck2 size={15} /> Marcar enviado
          </button>
        )}
        {contrato.estado === 'Enviado' && (
          <button className="admin-page__secondary-button" type="button" disabled={guardando} onClick={() => cambiarEstado('Aceptado')}>
            <Check size={15} /> Registrar aceptación firmada
          </button>
        )}
        {['Borrador', 'Enviado'].includes(contrato.estado) && contrato.total_pagado_usd === 0 && (
          <button className="admin-page__secondary-button" type="button" disabled={guardando} onClick={() => cambiarEstado('Cancelado')}>
            Cancelar contrato
          </button>
        )}
      </div>
      {enlaceWhatsApp && (
        <p className="contract-detail__muted">
          WhatsApp no adjunta el PDF automáticamente. Descarga el documento y adjúntalo manualmente antes de enviar el mensaje.
        </p>
      )}

      <section className="contract-detail__summary">
        <article><span>Monto acordado</span><MontoDual monto={contrato.monto_total_usd} /></article>
        <article><span>Total abonado</span><MontoDual monto={contrato.total_pagado_usd} /></article>
        <article><span>Saldo pendiente</span><MontoDual monto={contrato.saldo_pendiente_usd} /></article>
      </section>

      <section className="contract-detail__panel">
        <h2><CircleDollarSign size={16} /> Registrar un abono</h2>
        {contrato.estado !== 'Aceptado' ? (
          <p className="contract-detail__muted">Marca el contrato como aceptado después de recibir la firma o aprobación del cliente para habilitar los pagos.</p>
        ) : contrato.saldo_pendiente_usd <= 0.0001 ? (
          <p className="contract-detail__muted">Este contrato está pagado. No se pueden registrar abonos que superen el monto acordado.</p>
        ) : (
          <form className="contract-payment-form" onSubmit={registrarPago}>
            <label>
              Monto recibido
              <input type="number" min="0.01" step="0.01" max={pago.moneda === 'USD' ? contrato.saldo_pendiente_usd : undefined} value={pago.monto} onChange={(evento) => setPago((actual) => ({ ...actual, monto: evento.target.value }))} required />
            </label>
            <label>
              Moneda
              <select value={pago.moneda} onChange={(evento) => setPago((actual) => ({ ...actual, moneda: evento.target.value, tasa_usd_ves: tasaActual }))}>
                <option value="USD">USD</option>
                <option value="VES">Bolívares (VES)</option>
              </select>
            </label>
            {pago.moneda === 'VES' && (
              <label>
                Tasa aplicada (Bs. por USD)
                <input type="number" min="0.000001" step="0.000001" value={pago.tasa_usd_ves} onChange={(evento) => setPago((actual) => ({ ...actual, tasa_usd_ves: evento.target.value }))} required />
              </label>
            )}
            <label>
              Método
              <select value={pago.metodo} onChange={(evento) => setPago((actual) => ({ ...actual, metodo: evento.target.value }))}>
                <option>Efectivo</option>
                <option>Transferencia bancaria</option>
                <option>Pago móvil</option>
                <option>Zelle</option>
                <option>PayPal</option>
                <option>Otro</option>
              </select>
            </label>
            <label>
              Fecha del pago
              <input type="date" max={fechaHoy()} value={pago.fecha_pago} onChange={(evento) => setPago((actual) => ({ ...actual, fecha_pago: evento.target.value }))} required />
            </label>
            <label>
              Referencia (opcional)
              <input maxLength="120" value={pago.referencia} onChange={(evento) => setPago((actual) => ({ ...actual, referencia: evento.target.value }))} />
            </label>
            {pago.monto && Number.isFinite(equivalenciaUsd) && (
              <p className="contract-payment-form__conversion">
                Equivalente a {formatearUsd(equivalenciaUsd)}
                {pago.moneda === 'VES' && pago.tasa_usd_ves
                  ? ` · ${formatearBolivares(pago.monto)} a Bs. ${Number(pago.tasa_usd_ves).toLocaleString('es-VE')}/USD`
                  : ''}
              </p>
            )}
            <footer className="contract-payment-form__actions">
              <button className="admin-page__primary-button" type="submit" disabled={guardando}>
                <ReceiptText size={14} /> {guardando ? 'Registrando...' : 'Registrar abono'}
              </button>
              {!tasaActual && pago.moneda === 'VES' && <span className="contract-detail__muted">La tasa BCV no está cargada; introduce la tasa aplicada al pago.</span>}
            </footer>
          </form>
        )}
      </section>

      <section className="contract-detail__panel">
        <h2>Historial de pagos</h2>
        {contrato.pagos.length === 0 ? (
          <p className="contract-detail__muted">Todavía no se registran abonos.</p>
        ) : (
          <div className="admin-page__table-wrap">
            <table className="contract-detail__payment-list">
              <thead><tr><th>Fecha</th><th>Recibido</th><th>Método / referencia</th><th>Equivalente USD</th><th>Comprobante</th></tr></thead>
              <tbody>
                {contrato.pagos.map((movimiento) => (
                  <tr key={movimiento.id}>
                    <td>{fechaBonita(movimiento.fecha_pago)}</td>
                    <td>{movimiento.moneda === 'USD' ? formatearUsd(movimiento.monto) : formatearBolivares(movimiento.monto)}</td>
                    <td>{movimiento.metodo}{movimiento.referencia ? ` · ${movimiento.referencia}` : ''}</td>
                    <td>{formatearUsd(movimiento.equivalente_usd)}{movimiento.tasa_usd_ves ? ` · tasa ${movimiento.tasa_usd_ves}` : ''}</td>
                    <td><Link to={`/contratos/${id}/comprobantes/${movimiento.id}/imprimir?imprimir=1`} target="_blank">Imprimir recibo</Link></td>
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
