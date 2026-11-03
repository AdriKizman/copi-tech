import { formatearBolivares, formatearUsd } from '../utils/moneda';
import useTasaCambio from '../hooks/useTasaCambio';

export default function MontoDual({ monto, className = '' }) {
  const { tasa } = useTasaCambio();
  if (monto === null || monto === undefined || monto === '') {
    return <span className={className}>Por definir</span>;
  }

  const usd = Number(monto);
  const bolivares = tasa ? usd * Number(tasa.usd_ves) : null;

  return (
    <span className={`currency-amount ${className}`.trim()}>
      <strong>{formatearUsd(usd)}</strong>
      <small>
        {bolivares === null
          ? 'Equivalente en Bs. pendiente de tasa BCV'
          : `≈ ${formatearBolivares(bolivares)}`}
      </small>
    </span>
  );
}
