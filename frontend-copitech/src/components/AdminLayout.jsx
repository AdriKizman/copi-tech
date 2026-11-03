import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BellRing,
  ContactRound,
  LayoutDashboard,
  LogOut,
  ClipboardList,
  CircleDollarSign,
  FolderKanban,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import './AdminLayout.css';

const enlaces = [
  { to: '/dashboard', label: 'Resumen', Icon: LayoutDashboard },
  { to: '/ordenes', label: 'Órdenes', Icon: ClipboardList },
  { to: '/clientes', label: 'Clientes', Icon: ContactRound },
  { to: '/proyectos-web', label: 'Proyectos web', Icon: FolderKanban },
  { to: '/contratos', label: 'Contratos y pagos', Icon: FileText },
  { to: '/recordatorios', label: 'Recordatorios', Icon: BellRing },
  { to: '/informes', label: 'Informes', Icon: BarChart3 },
  { to: '/tasa-cambio', label: 'Tasa BCV', Icon: CircleDollarSign },
  { to: '/administracion', label: 'Administración', Icon: ShieldCheck, adminOnly: true },
];

function rolSesion() {
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    return usuario.rol;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return '';
    }

    throw error;
  }
}

function nombreSesion() {
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    return typeof usuario.nombre === 'string' && usuario.nombre.trim()
      ? usuario.nombre.trim()
      : 'Administración';
  } catch (error) {
    if (error instanceof SyntaxError) {
      return 'Administración';
    }

    throw error;
  }
}

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const esAdmin = rolSesion() === 'admin';

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/admin');
  };

  return (
    <div className="admin-shell">
      <header className="admin-shell__header">
        <div className="admin-shell__header-inner">
          <NavLink className="admin-shell__brand" to="/dashboard">
            <span><img src="/logo_principal.png" alt="" /></span>
            <strong>CopiTech</strong>
            <small>ADMIN</small>
          </NavLink>

          <nav className="admin-shell__nav" aria-label="Navegación administrativa">
            {enlaces.filter(({ adminOnly }) => !adminOnly || esAdmin).map(({ to, label, Icon }) => (
              <NavLink
                className={({ isActive }) =>
                  `admin-shell__nav-link${isActive ? ' admin-shell__nav-link--active' : ''}`
                }
                key={to}
                to={to}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="admin-shell__account">
            <span>{nombreSesion()}</span>
            <button type="button" onClick={cerrarSesion} aria-label="Cerrar sesión" title="Cerrar sesión">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>
      <div className="admin-shell__content">{children}</div>
    </div>
  );
}
