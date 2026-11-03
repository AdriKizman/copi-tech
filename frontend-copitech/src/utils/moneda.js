const formatoUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatoNumeroVenezolano = new Intl.NumberFormat('es-VE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatearUsd(valor) {
  return formatoUsd.format(Number(valor));
}

export function formatearBolivares(valor) {
  return `Bs. ${formatoNumeroVenezolano.format(Number(valor))}`;
}

export function formatearTasa(valor) {
  return formatoNumeroVenezolano.format(Number(valor));
}

export function formatearFechaVenezuela(fecha) {
  if (!fecha) return 'Fecha no disponible';
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const fechaLocal = new Date(anio, mes - 1, dia, 12);
  return new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' }).format(fechaLocal);
}

export function fechaActualVenezuela() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const porTipo = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${porTipo.year}-${porTipo.month}-${porTipo.day}`;
}
