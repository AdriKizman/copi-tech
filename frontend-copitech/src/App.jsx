import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Inicio from './pages/Inicio';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NuevaOrden from './pages/NuevaOrden';
import AdminLayout from './components/AdminLayout';
import Ordenes from './pages/Ordenes';
import OrdenDetalle from './pages/OrdenDetalle';
import Clientes from './pages/Clientes';
import ClienteDetalle from './pages/ClienteDetalle';
import Recordatorios from './pages/Recordatorios';
import Informes from './pages/Informes';
import TasaCambio from './pages/TasaCambio';
import Seguimiento from './pages/Seguimiento';
import ProyectosWeb from './pages/ProyectosWeb';
import ProgresoProyecto from './pages/ProgresoProyecto';
import Contratos from './pages/Contratos';
import ContratoDetalle from './pages/ContratoDetalle';
import DocumentoContrato from './pages/DocumentoContrato';
import ComprobanteRecepcion from './pages/ComprobanteRecepcion';
import Administracion from './pages/Administracion';
import TasaCambioProvider from './contexts/TasaCambioProvider';

function RutaAdministrativa({ children }) {
  const location = useLocation();
  return localStorage.getItem('token')
    ? children
    : <Navigate to="/admin" replace state={{ from: location, reason: 'login-required' }} />;
}

function RutaSoloAdmin({ children }) {
  let esAdmin = false;
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    esAdmin = usuario.rol === 'admin';
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }
  }
  return esAdmin ? children : <Navigate to="/dashboard" replace />;
}

function App() {
  const paginaAdmin = (pagina) => (
    <RutaAdministrativa>
      <AdminLayout>{pagina}</AdminLayout>
    </RutaAdministrativa>
  );
  const paginaDocumento = (pagina) => (
    <RutaAdministrativa>{pagina}</RutaAdministrativa>
  );

  return (
    <TasaCambioProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/admin" element={<Login />} />
          <Route path="/login" element={<Navigate to="/admin" replace />} />
          <Route path="/seguimiento/:codigo" element={<Seguimiento />} />
          <Route path="/proyecto/:token" element={<ProgresoProyecto />} />
          <Route path="/contrato/:token" element={<DocumentoContrato />} />
          <Route path="/contratos/:id/comprobantes/:pagoId/imprimir" element={paginaDocumento(<DocumentoContrato />)} />
          <Route path="/contratos/:id/imprimir" element={paginaDocumento(<DocumentoContrato />)} />
          <Route path="/contratos/:id" element={paginaAdmin(<ContratoDetalle />)} />
          <Route path="/contratos" element={paginaAdmin(<Contratos />)} />
          <Route path="/ordenes/:id/comprobante-recepcion" element={paginaDocumento(<ComprobanteRecepcion />)} />
          <Route path="/dashboard" element={paginaAdmin(<Dashboard />)} />
          <Route
            path="/administracion"
            element={paginaAdmin(<RutaSoloAdmin><Administracion /></RutaSoloAdmin>)}
          />
          <Route path="/ordenes" element={paginaAdmin(<Ordenes />)} />
          <Route path="/ordenes/:id" element={paginaAdmin(<OrdenDetalle />)} />
          <Route path="/clientes" element={paginaAdmin(<Clientes />)} />
          <Route path="/clientes/:id" element={paginaAdmin(<ClienteDetalle />)} />
          <Route path="/recordatorios" element={paginaAdmin(<Recordatorios />)} />
          <Route path="/informes" element={paginaAdmin(<Informes />)} />
          <Route path="/tasa-cambio" element={paginaAdmin(<TasaCambio />)} />
          <Route path="/proyectos-web" element={paginaAdmin(<ProyectosWeb />)} />
          <Route path="/nueva-orden" element={paginaAdmin(<NuevaOrden />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </TasaCambioProvider>
  );
}

export default App;
