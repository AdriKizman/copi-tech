import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import TasaCambioContext from './TasaCambioContext';

export default function TasaCambioProvider({ children }) {
  const [tasa, setTasa] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const recargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const { data } = await axios.get('/api/tasa-cambio');
      setTasa(data.tasa);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo consultar la tasa BCV.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let activa = true;
    axios.get('/api/tasa-cambio')
      .then(({ data }) => {
        if (activa) setTasa(data.tasa);
      })
      .catch((err) => {
        if (activa) setError(err.response?.data?.error || 'No se pudo consultar la tasa BCV.');
      })
      .finally(() => {
        if (activa) setCargando(false);
      });
    return () => {
      activa = false;
    };
  }, []);

  const value = useMemo(() => ({ tasa, cargando, error, recargar }), [tasa, cargando, error, recargar]);

  return <TasaCambioContext.Provider value={value}>{children}</TasaCambioContext.Provider>;
}
