import { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart3, CalendarDays, CheckCircle, CircleDollarSign, RefreshCw } from 'lucide-react';
import MontoDual from '../components/MontoDual';
import { formatearBolivares, formatearUsd } from '../utils/moneda';
import useTasaCambio from '../hooks/useTasaCambio';
import './AdminPages.css';

function fechaLocal(fecha) {
  const ajustada = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000);
  return ajustada.toISOString().slice(0, 10);
}

function fechaHace(dias) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fechaLocal(fecha);
}

function formatearDiaInforme(fecha) {
  const dia = String(fecha).slice(0, 10);
  return new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'short' })
    .format(new Date(`${dia}T12:00:00`));
}

export default function Informes() {
  const { tasa } = useTasaCambio();
  const [desde, setDesde] = useState(() => fechaHace(29));
  const [hasta, setHasta] = useState(() => fechaLocal(new Date()));
  const [rango, setRango] = useState({ desde: fechaHace(29), hasta: fechaLocal(new Date()) });
  const [informe, setInforme] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(rango);
    axios
      .get(`/api/ordenes/informe?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        signal: controller.signal,
      })
      .then(({ data }) => setInforme(data))
      .catch((err) => {
        if (!axios.isCancel(err)) setError(err.response?.data?.error || 'No se pudo generar el informe.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });
    return () => controller.abort();
  }, [rango]);

  const generar = (evento) => {
    evento.preventDefault();
    setError('');
    setCargando(true);
    setRango({ desde, hasta });
  };

  const valores = informe?.por_dia || [];
  const valorMaximo = Math.max(...valores.map((fila) => Number(fila.valor_presupuestado)), 1);

  return (
    <main className="admin-page">
      <header className="admin-page__heading">
        <div>
          <p className="admin-page__eyebrow">RENDIMIENTO DEL TALLER</p>
          <h1>Informes</h1>
          <p>Consulta los cobros recibidos y compáralos con los presupuestos de órdenes entregadas.</p>
        </div>
        <BarChart3 size={24} className="admin-page__heading-icon" />
      </header>

      <section className="admin-page__panel admin-page__report-filter">
        <form onSubmit={generar}>
          <label>Desde<input type="date" value={desde} max={hasta} onChange={(evento) => setDesde(evento.target.value)} required /></label>
          <label>Hasta<input type="date" value={hasta} min={desde} max={fechaLocal(new Date())} onChange={(evento) => setHasta(evento.target.value)} required /></label>
          <button className="admin-page__primary-button" type="submit" disabled={cargando}><RefreshCw size={14} /> Generar informe</button>
        </form>
        <div className="admin-page__report-presets">
          {[
            { label: '7 días', dias: 6 },
            { label: '30 días', dias: 29 },
            { label: '90 días', dias: 89 },
          ].map(({ label, dias }) => (
            <button key={label} type="button" onClick={() => { const nuevoDesde = fechaHace(dias); const nuevoHasta = fechaLocal(new Date()); setDesde(nuevoDesde); setHasta(nuevoHasta); setCargando(true); setRango({ desde: nuevoDesde, hasta: nuevoHasta }); }}>{label}</button>
          ))}
        </div>
      </section>

      {error && <div className="admin-page__error" role="alert">{error}</div>}
      {cargando && !informe ? (
        <div className="admin-page__panel admin-page__state"><BarChart3 size={22} /><p>Calculando informe...</p></div>
      ) : informe && (
        <>
          <section className="admin-page__summary-grid admin-page__report-summary">
            <article className="admin-page__summary-card">
              <span><CircleDollarSign size={14} /> Cobrado en el período</span>
              <MontoDual monto={informe.cobros.resumen.total_cobrado_usd} />
            </article>
            <article className="admin-page__summary-card">
              <span><CheckCircle size={14} /> Abonos registrados</span>
              <strong>{Number(informe.cobros.resumen.pagos_registrados).toLocaleString('es-VE')}</strong>
            </article>
            <article className="admin-page__summary-card">
              <span><CalendarDays size={14} /> Saldo de contratos aceptados</span>
              <MontoDual monto={informe.resumen.saldo_pendiente_contratos_usd} />
            </article>
          </section>

          <section className="admin-page__summary-grid admin-page__report-summary">
            <article className="admin-page__summary-card">
              <span><CircleDollarSign size={14} /> Recibido directamente en USD</span>
              <strong>{formatearUsd(informe.cobros.resumen.total_recibido_usd)}</strong>
            </article>
            <article className="admin-page__summary-card">
              <span><CircleDollarSign size={14} /> Recibido directamente en Bs.</span>
              <strong>{formatearBolivares(informe.cobros.resumen.total_recibido_ves)}</strong>
            </article>
            <article className="admin-page__summary-card">
              <span><CheckCircle size={14} /> Contratos con abonos</span>
              <strong>{Number(informe.cobros.resumen.contratos_con_pagos).toLocaleString('es-VE')}</strong>
            </article>
          </section>

          <section className="admin-page__panel admin-page__chart-panel">
            <header>
              <div><p className="admin-page__eyebrow">VALOR POR FECHA DE ENTREGA</p><h2>Actividad del período</h2></div>
              <span>{new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' }).format(new Date(`${informe.desde}T12:00:00`))} — {new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' }).format(new Date(`${informe.hasta}T12:00:00`))}</span>
            </header>
            {valores.length === 0 ? (
              <div className="admin-page__state"><BarChart3 size={22} /><strong>Sin entregas en este período</strong><p>Cuando existan órdenes entregadas con presupuesto, aparecerán aquí.</p></div>
            ) : (
              <div className="admin-page__chart">
                {valores.map((fila) => {
                  const porcentaje = Math.max((Number(fila.valor_presupuestado) / valorMaximo) * 100, 4);
                  return (
                    <div
                      className="admin-page__chart-column"
                      key={fila.fecha}
                      title={`${fila.fecha}: ${formatearUsd(fila.valor_presupuestado)}${tasa ? ` · ${formatearBolivares(Number(fila.valor_presupuestado) * Number(tasa.usd_ves))}` : ''} · ${fila.ordenes_entregadas} órdenes`}
                    >
                      <span className="admin-page__chart-value">{formatearUsd(fila.valor_presupuestado)}</span>
                      <span className="admin-page__chart-ves-value">
                        {tasa ? formatearBolivares(Number(fila.valor_presupuestado) * Number(tasa.usd_ves)) : 'Tasa no registrada'}
                      </span>
                      <span className="admin-page__chart-bar" style={{ height: `${porcentaje}%` }} />
                      <span className="admin-page__chart-date">{formatearDiaInforme(fila.fecha)}</span>
                      <small>{fila.ordenes_entregadas} ord.</small>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="admin-page__report-note">
              Los cobros se contabilizan por fecha de pago. El saldo corresponde al monto pendiente actual de contratos aceptados; las órdenes sin contrato no se incluyen. El presupuesto de órdenes entregadas es una referencia operativa, no representa contabilidad, utilidad ni flujo de caja.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
