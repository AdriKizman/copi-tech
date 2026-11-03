import { useContext } from 'react';
import TasaCambioContext from '../contexts/TasaCambioContext';

export default function useTasaCambio() {
  const context = useContext(TasaCambioContext);
  if (!context) {
    throw new Error('useTasaCambio debe usarse dentro de TasaCambioProvider');
  }
  return context;
}
