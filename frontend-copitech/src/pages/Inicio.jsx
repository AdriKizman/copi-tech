import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleDollarSign,
  Code2,
  Laptop,
  LoaderCircle,
  Mail,
  Menu,
  MonitorCog,
  Smartphone,
  Wrench,
  X,
} from 'lucide-react';
import './Inicio.css';
import useTasaCambio from '../hooks/useTasaCambio';
import { formatearFechaVenezuela, formatearTasa } from '../utils/moneda';

const servicios = [
  {
    Icon: Code2,
    numero: '01',
    titulo: 'Aplicaciones web',
    texto: 'Plataformas rápidas y fáciles de usar, diseñadas alrededor de los objetivos de tu negocio.',
    etiquetas: ['Sistemas a medida', 'Paneles web'],
  },
  {
    Icon: MonitorCog,
    numero: '02',
    titulo: 'Sistemas contables',
    texto: 'Herramientas para organizar procesos, controlar información y trabajar con más claridad.',
    etiquetas: ['Automatización', 'Gestión'],
  },
  {
    Icon: Wrench,
    numero: '03',
    titulo: 'Reparación de equipos',
    texto: 'Diagnóstico y reparación de equipos con comunicación clara durante cada etapa del servicio.',
    etiquetas: ['Diagnóstico', 'Mantenimiento'],
  },
];

const pasos = [
  ['01', 'Cuéntame tu idea', 'Explícame qué necesitas resolver y qué resultado esperas.'],
  ['02', 'Definimos el plan', 'Revisamos el alcance y preparo una cotización a tu medida.'],
  ['03', 'Lo ponemos en marcha', 'Avanzamos contigo y te mantenemos al tanto del proceso.'],
];

export default function Inicio() {
  const navigate = useNavigate();
  const { tasa, cargando: cargandoTasa, error: errorTasa } = useTasaCambio();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [codigoSeguimiento, setCodigoSeguimiento] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [estadoFormulario, setEstadoFormulario] = useState(null);
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    email: '',
    servicio: '',
    mensaje: '',
    website: '',
  });

  const cambiarCampo = (evento) => {
    setForm({ ...form, [evento.target.name]: evento.target.value });
  };

  const enviarSolicitud = async (evento) => {
    evento.preventDefault();
    setEstadoFormulario(null);

    if (form.website) {
      setEstadoFormulario({
        tipo: 'success',
        mensaje: 'Gracias. Recibí tu solicitud y pronto me pondré en contacto.',
      });
      return;
    }

    setEnviando(true);
    try {
      await axios.post('/api/contacto', {
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        email: form.email.trim(),
        servicio: form.servicio,
        mensaje: form.mensaje.trim(),
      });
      setForm({
        nombre: '',
        telefono: '',
        email: '',
        servicio: '',
        mensaje: '',
        website: '',
      });
      setEstadoFormulario({
        tipo: 'success',
        mensaje: '¡Gracias! Recibí tu solicitud y pronto me pondré en contacto.',
      });
    } catch (error) {
      setEstadoFormulario({
        tipo: 'error',
        mensaje:
          error.response?.data?.error ||
          'No se pudo enviar la solicitud. Intenta de nuevo en unos minutos.',
      });
    } finally {
      setEnviando(false);
    }
  };

  const cerrarMenu = () => setMenuAbierto(false);

  const consultarSeguimiento = (evento) => {
    evento.preventDefault();
    const codigo = codigoSeguimiento.trim();
    if (codigo) navigate(`/seguimiento/${encodeURIComponent(codigo)}`);
  };

  return (
    <main className="site">
      <header className="site-header">
        <div className="site-container site-header__inner">
          <a className="site-brand" href="#inicio" onClick={cerrarMenu}>
            <img className="site-brand__logo" src="/logo_segundario.png" alt="CopiTech" />
          </a>

          <button
            className="site-menu-toggle"
            type="button"
            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuAbierto}
            onClick={() => setMenuAbierto(!menuAbierto)}
          >
            {menuAbierto ? <X size={21} /> : <Menu size={21} />}
          </button>

          <nav className={`site-nav${menuAbierto ? ' site-nav--open' : ''}`}>
            <a href="#servicios" onClick={cerrarMenu}>Servicios</a>
            <a href="#seguimiento" onClick={cerrarMenu}>Seguimiento</a>
            <a href="#planes" onClick={cerrarMenu}>Planes</a>
            <a href="#trabajos" onClick={cerrarMenu}>Trabajos</a>
            <a href="#contacto" onClick={cerrarMenu}>Contacto</a>
            <a className="site-nav__admin" href="/admin">Panel administrativo</a>
          </nav>
        </div>
      </header>

      <section className="site-hero" id="inicio">
        <div className="site-container site-hero__grid">
          <div className="site-hero__copy">
            <span className="site-kicker">
              <span className="site-kicker__line" />
              TECNOLOGÍA QUE TRABAJA PARA TI
            </span>
            <h1>
              Soluciones digitales
              <br />
              <span>para avanzar.</span>
            </h1>
            <p className="site-hero__description">
              Desarrollo sistemas y aplicaciones para tu negocio, y reparo tus
              equipos con un servicio cercano y transparente.
            </p>
            <div className="site-hero__actions">
              <a className="site-button site-button--primary" href="#contacto">
                Cuéntame qué necesitas
                <ArrowRight size={17} />
              </a>
              <a className="site-hero__secondary" href="#servicios">
                Conoce los servicios
                <ArrowDown size={16} />
              </a>
            </div>
            <div className="site-hero__trust">
              <span><Check size={15} /> Atención personalizada</span>
              <span><Check size={15} /> Cotización según tu proyecto</span>
            </div>
          
          </div>

          <div className="site-hero-art" aria-label="Desarrollo y soporte tecnológico">
            <div className="site-hero-art__glow" />
            <div className="site-window">
              <div className="site-window__top">
                <span /><span /><span />
                <small>tu-proyecto.app</small>
              </div>
              <div className="site-window__body">
                <div className="site-window__sidebar">
                  <i /><i /><i /><i />
                </div>
                <div className="site-window__content">
                  <span className="site-window__caption">PANEL DE CONTROL</span>
                  <strong>Todo en orden.</strong>
                  <div className="site-window__cards">
                    <i /><i /><i />
                  </div>
                  <div className="site-window__chart">
                    <span /><span /><span /><span /><span /><span /><span />
                  </div>
                </div>
              </div>
            </div>
            <div className="site-float-card site-float-card--code">
              <span><Code2 size={17} /></span>
              <div><strong>Desarrollo a medida</strong><small>Hecho para tu negocio</small></div>
              <Check size={16} />
            </div>
            <div className="site-float-card site-float-card--repair">
              <span><Laptop size={18} /></span>
              <div><strong>Soporte técnico</strong><small>Diagnóstico confiable</small></div>
            </div>
            <div className="site-hero-art__caption">
              <span className="site-hero-art__caption-icon"><Smartphone size={16} /></span>
              <span>Ideas que se convierten en soluciones.</span>
            </div>
          </div>
        </div>
        <div className="site-hero__bottom">
          <div className="site-container site-hero__bottom-inner">
            <span>DESARROLLO · SISTEMAS · REPARACIÓN</span>
            <a href="#servicios">Explorar servicios <ArrowDown size={14} /></a>
          </div>
        </div>
      </section>

      <section className="site-tracking" id="seguimiento">
        <div className="site-container">
          <div className="site-tracking__card">
            <div className="site-tracking__copy">
              <span className="site-tracking__icon"><Smartphone size={20} /></span>
              <div>
                <p className="site-kicker"><span className="site-kicker__line" /> SEGUIMIENTO DE REPARACIÓN</p>
                <h2>¿Ya entregaste tu equipo?</h2>
                <p>Escanea el QR de tu comprobante o pega aquí el código privado de seguimiento que te compartimos.</p>
              </div>
            </div>
            <form className="site-tracking__form" onSubmit={consultarSeguimiento}>
              <label htmlFor="codigo-seguimiento">Código de acceso privado</label>
              <div className="site-tracking__input-row">
                <input
                  id="codigo-seguimiento"
                  type="text"
                  value={codigoSeguimiento}
                  onChange={(evento) => setCodigoSeguimiento(evento.target.value)}
                  placeholder="Pega el código de tu enlace privado"
                  maxLength="64"
                  autoComplete="off"
                  required
                />
                <button className="site-button site-button--primary" type="submit">
                  Consultar <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="site-services site-section" id="servicios">
        <div className="site-container">
          <div className="site-section-heading">
            <div>
              <p className="site-kicker"><span className="site-kicker__line" /> LO QUE PUEDO HACER POR TI</p>
              <h2>Tecnología útil.<br /><span>Soluciones reales.</span></h2>
            </div>
            <p>
              Ya sea una idea que quieres llevar a la web o un equipo que necesita
              volver a funcionar, buscamos una solución clara y adecuada para ti.
            </p>
          </div>
          <div className="site-services__grid">
            {servicios.map(({ Icon, numero, titulo, texto, etiquetas }) => (
              <article className="service-card" key={numero}>
                <div className="service-card__top">
                  <span className="service-card__icon"><Icon size={21} /></span>
                  <span className="service-card__number">{numero}</span>
                </div>
                <h3>{titulo}</h3>
                <p>{texto}</p>
                <div className="service-card__tags">
                  {etiquetas.map((etiqueta) => <span key={etiqueta}>{etiqueta}</span>)}
                </div>
                <a href="#contacto" aria-label={`Consultar por ${titulo}`}>
                  Hablemos de esto <ArrowUpRight size={16} />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="site-plans site-section" id="planes">
        <div className="site-container site-plans__grid">
          <div className="site-plans__copy">
            <p className="site-kicker"><span className="site-kicker__line" /> PLANES A TU MEDIDA</p>
            <h2>Un plan que parte<br />de lo que <span>necesitas.</span></h2>
            <p>
              Cada negocio y cada equipo es distinto. Por eso primero escucho tu
              necesidad y luego te propongo una solución con alcance y precio claros.
            </p>
            <a className="site-button site-button--light" href="#contacto">
              Solicitar cotización <ArrowRight size={17} />
            </a>
          </div>
          <div className="site-plans__steps">
            {pasos.map(([numero, titulo, texto]) => (
              <article className="plan-step" key={numero}>
                <span className="plan-step__number">{numero}</span>
                <div><h3>{titulo}</h3><p>{texto}</p></div>
                <ArrowUpRight size={17} />
              </article>
            ))}
            <p className="site-plans__note">Sin precios genéricos: una propuesta pensada para tu caso.</p>
            <div className="site-plans__exchange" aria-live="polite">
              <span className="site-plans__exchange-icon"><CircleDollarSign size={17} /></span>
              <div>
                <strong>
                  {tasa
                    ? `1 USD = Bs. ${formatearTasa(tasa.usd_ves)}`
                    : cargandoTasa
                      ? 'Consultando tasa BCV...'
                      : 'Tasa BCV no registrada'}
                </strong>
                <small>
                  {tasa
                    ? `Referencia del ${formatearFechaVenezuela(tasa.fecha)}. Las cotizaciones se presentan en USD y su equivalente en bolívares usa esta tasa.`
                    : errorTasa || 'La equivalencia en bolívares se mostrará cuando se registre la tasa diaria.'}
                </small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="site-work site-section" id="trabajos">
        <div className="site-container">
          <div className="site-section-heading site-section-heading--work">
            <div>
              <p className="site-kicker"><span className="site-kicker__line" /> PORTAFOLIO</p>
              <h2>Trabajo hecho con<br /><span>intención y detalle.</span></h2>
            </div>
            <p>
              Estoy preparando esta sección para compartir proyectos y casos reales.
              ¿Tienes una idea? Quizá podamos construirla juntos.
            </p>
          </div>
          <div className="site-work__empty">
            <div className="site-work__visual">
              <span className="site-work__visual-ring site-work__visual-ring--outer" />
              <span className="site-work__visual-ring site-work__visual-ring--inner" />
              <span className="site-work__visual-icon"><Code2 size={28} /></span>
              <span className="site-work__spark site-work__spark--one">✳</span>
              <span className="site-work__spark site-work__spark--two">✦</span>
            </div>
            <div className="site-work__message">
              <span className="site-work__label">NUEVOS PROYECTOS EN CAMINO</span>
              <h3>El próximo proyecto destacado<br />podría ser el tuyo.</h3>
              <a href="#contacto">Hablemos de tu idea <ArrowRight size={16} /></a>
            </div>
            <span className="site-work__index">PORTAFOLIO · 2026</span>
          </div>
        </div>
      </section>

      <section className="site-contact site-section" id="contacto">
        <div className="site-container site-contact__grid">
          <div className="site-contact__copy">
            <p className="site-kicker"><span className="site-kicker__line" /> EMPECEMOS POR CONVERSAR</p>
            <h2>¿Qué necesitas<br /><span>resolver?</span></h2>
            <p>
              Cuéntame un poco sobre tu proyecto o equipo. Revisaré tu solicitud y
              me pondré en contacto para entender cómo ayudarte.
            </p>
            <div className="site-contact__promise">
              <span><Mail size={18} /></span>
              <div><strong>Contacto directo</strong><small>Tu mensaje llega al equipo de CopiTech.</small></div>
            </div>
          </div>

          <form className="contact-form" onSubmit={enviarSolicitud}>
            <div className="contact-form__heading">
              <span>FORMULARIO DE CONTACTO</span>
              <h3>Cuéntame tu idea</h3>
            </div>
            {estadoFormulario && (
              <div className={`contact-form__notice contact-form__notice--${estadoFormulario.tipo}`} role="status">
                {estadoFormulario.mensaje}
              </div>
            )}
            <div className="contact-form__row">
              <label>
                Tu nombre
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={cambiarCampo}
                  placeholder="¿Cómo te llamas?"
                  maxLength="100"
                  autoComplete="name"
                  required
                />
              </label>
              <label>
                Teléfono
                <input
                  type="tel"
                  name="telefono"
                  value={form.telefono}
                  onChange={cambiarCampo}
                  placeholder="Tu número de contacto"
                  maxLength="30"
                  autoComplete="tel"
                  required
                />
              </label>
            </div>
            <label>
              Correo electrónico <span className="contact-form__optional">(opcional)</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={cambiarCampo}
                placeholder="tu@correo.com"
                maxLength="150"
                autoComplete="email"
              />
            </label>
            <label>
              ¿En qué te puedo ayudar?
              <select name="servicio" value={form.servicio} onChange={cambiarCampo} required>
                <option value="" disabled>Selecciona un servicio</option>
                <option value="Aplicación web">Aplicación web</option>
                <option value="Desarrollo web">Desarrollo web / programación</option>
                <option value="Sistema contable">Sistema contable</option>
                <option value="Reparación de equipo">Reparación de equipo</option>
                <option value="Otro">Otro / No estoy seguro</option>
              </select>
            </label>
            <label>
              Cuéntame un poco más
              <textarea
                name="mensaje"
                value={form.mensaje}
                onChange={cambiarCampo}
                placeholder="Describe brevemente lo que necesitas..."
                rows="4"
                maxLength="2000"
                required
              />
            </label>
            <label className="contact-form__honeypot" aria-hidden="true">
              Sitio web
              <input
                name="website"
                value={form.website}
                onChange={cambiarCampo}
                tabIndex="-1"
                autoComplete="off"
              />
            </label>
            <button className="site-button site-button--primary contact-form__submit" type="submit" disabled={enviando}>
              {enviando ? (
                <><LoaderCircle className="contact-form__spinner" size={17} /> Enviando...</>
              ) : (
                <>Enviar solicitud <ArrowRight size={17} /></>
              )}
            </button>
            <p className="contact-form__privacy">
              Usaré tus datos únicamente para responder a esta solicitud.
            </p>
          </form>
        </div>
      </section>

      <footer className="site-footer">
        <div className="site-container site-footer__inner">
          <a className="site-brand site-brand--footer" href="#inicio">
            <img className="site-brand__logo" src="/logo_segundario.png" alt="CopiTech" />
          </a>
          <p>Soluciones digitales y soporte técnico, con atención cercana.</p>
          <a href="/admin">Acceso administrativo <ArrowUpRight size={14} /></a>
          <span className="site-footer__copyright">© {new Date().getFullYear()} CopiTech</span>
        </div>
      </footer>
    </main>
  );
}
