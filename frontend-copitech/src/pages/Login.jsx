import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Smartphone,
  Wrench,
} from 'lucide-react';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const avisoSesion = location.state?.reason === 'session-expired'
    ? 'Tu sesión anterior venció. Inicia sesión con tus credenciales; después podrás abrir de nuevo el contrato guardado.'
    : location.state?.reason === 'password-changed'
      ? 'Tu contraseña fue cambiada. Inicia sesión nuevamente con la nueva contraseña.'
    : '';

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const respuesta = await axios.post('/api/auth/login', { email, password });
      localStorage.setItem('token', respuesta.data.token);
      localStorage.setItem('usuario', JSON.stringify(respuesta.data.usuario));
      const destino = location.state?.from?.pathname?.startsWith('/contratos')
        ? '/contratos'
        : '/dashboard';
      navigate(destino, { replace: true, state: null });
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'No se pudo iniciar sesión. Revisa tus datos e inténtalo de nuevo.',
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="login">
      <section className="login__showcase" aria-label="CopiTech">
        <div className="login__showcase-content">
          <Link className="login__brand" to="/" aria-label="CopiTech, inicio">
            <span className="login__brand-icon">
              <Wrench size={22} strokeWidth={2.2} />
            </span>
            <span>CopiTech</span>
          </Link>

          <div className="login__intro">
            <span className="login__pill">
              <span className="login__pulse" />
              TU TALLER, SIEMPRE AL DÍA
            </span>
            <h1>
              Cada reparación,
              <br />
              bajo control.
            </h1>
            <p>
              Administra tus órdenes y mantén el trabajo de tu taller organizado desde un solo lugar.
            </p>
          </div>

          <div className="login__preview" aria-hidden="true">
            <div className="login__preview-top">
              <span className="login__preview-device">
                <Smartphone size={19} />
              </span>
              <div>
                <strong>Orden de reparación</strong>
                <span>Servicio técnico</span>
              </div>
              <span className="login__preview-status">En proceso</span>
            </div>
            <div className="login__preview-line">
              <span />
            </div>
            <div className="login__preview-bottom">
              <span>Diagnóstico y seguimiento</span>
              <ShieldCheck size={17} />
            </div>
          </div>
        </div>

        <div className="login__showcase-footer">
          <span>Gestión simple para un mejor servicio.</span>
          <span>© {new Date().getFullYear()} CopiTech</span>
        </div>
        <span className="login__decoration login__decoration--one" />
        <span className="login__decoration login__decoration--two" />
      </section>

      <section className="login__form-panel">
        <div className="login__form-wrap">
          <div className="login__mobile-brand">
            <span className="login__brand-icon">
              <Wrench size={21} strokeWidth={2.2} />
            </span>
            <strong>CopiTech</strong>
          </div>

          <div className="login__heading">
            <p className="login__eyebrow">PANEL DE ADMINISTRACIÓN</p>
            <h2>Bienvenido de nuevo</h2>
            <p className="login__description">Ingresa con tu cuenta para continuar.</p>
            {avisoSesion && <p className="login__session-notice" role="status">{avisoSesion}</p>}
          </div>

          <form className="login__form" onSubmit={handleLogin}>
            {error && (
              <div className="login__error" role="alert">
                {error}
              </div>
            )}

            <label className="login__field">
              <span>Correo electrónico</span>
              <span className="login__input-wrap">
                <Mail size={18} aria-hidden="true" />
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="nombre@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </span>
            </label>

            <label className="login__field">
              <span>Contraseña</span>
              <span className="login__input-wrap">
                <LockKeyhole size={18} aria-hidden="true" />
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  className="login__password-toggle"
                  type="button"
                  onClick={() => setMostrarPassword((visible) => !visible)}
                  aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            <button className="login__submit" type="submit" disabled={cargando}>
              {cargando ? (
                <>
                  <LoaderCircle className="login__spinner" size={18} />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  Iniciar sesión
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="login__secure">
            <ShieldCheck size={16} />
            Acceso seguro para el equipo de tu taller
          </p>
        </div>
      </section>
    </main>
  );
}
