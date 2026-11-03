import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle,
  ChevronDown,
  ClipboardList,
  Clock3,
  ExternalLink,
  Mail,
  MessageSquareText,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Smartphone,
  Wrench,
} from "lucide-react";
import "./Dashboard.css";
import MontoDual from "../components/MontoDual";

const estados = [
  {
    label: "Recibidos",
    key: "Recibido",
    description: "Pendientes de revisión",
    Icon: Smartphone,
    tone: "blue",
  },
  {
    label: "En diagnóstico",
    key: "En Diagnóstico",
    description: "En revisión técnica",
    Icon: Clock3,
    tone: "amber",
  },
  {
    label: "Esperando repuesto",
    key: "Esperando Repuesto",
    description: "A la espera de piezas",
    Icon: Package,
    tone: "violet",
  },
  {
    label: "Listos",
    key: "Listo",
    description: "Preparados para entrega",
    Icon: CheckCircle,
    tone: "green",
  },
  {
    label: "Entregados",
    key: "Entregado",
    description: "Reparaciones finalizadas",
    Icon: Wrench,
    tone: "slate",
  },
];

const opcionesEstado = [
  "Recibido",
  "En Diagnóstico",
  "Esperando Repuesto",
  "Listo",
  "Entregado",
];

function formatearFecha(fecha) {
  if (!fecha) {
    return "Fecha no disponible";
  }

  const fechaValida = new Date(fecha);
  if (Number.isNaN(fechaValida.getTime())) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-VE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(fechaValida);
}

function telefonoWhatsApp(telefono) {
  const digitos = telefono.replace(/\D/g, "");
  return digitos.startsWith("0") ? `58${digitos.slice(1)}` : digitos;
}

function obtenerNombreUsuario() {
  try {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
    return typeof usuario.nombre === "string" && usuario.nombre.trim()
      ? usuario.nombre.trim()
      : "equipo";
  } catch (error) {
    if (error instanceof SyntaxError) {
      return "equipo";
    }

    throw error;
  }
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [ordenes, setOrdenes] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoOrdenes, setCargandoOrdenes] = useState(true);
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(true);
  const [error, setError] = useState("");
  const [errorOrdenes, setErrorOrdenes] = useState("");
  const [errorSolicitudes, setErrorSolicitudes] = useState("");
  const [solicitud, setSolicitud] = useState(0);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [ordenActualizando, setOrdenActualizando] = useState(null);
  const [solicitudAceptando, setSolicitudAceptando] = useState(null);
  const navigate = useNavigate();
  const nombreUsuario = obtenerNombreUsuario();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/admin");
      return;
    }

    const controller = new AbortController();
    axios
      .get("/api/ordenes/stats", {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      .then((respuesta) => setStats(respuesta.data))
      .catch((err) => {
        if (axios.isCancel(err)) {
          return;
        }

        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("usuario");
          navigate("/admin");
          return;
        }

        setError(
          err.response?.data?.error ||
            "No se pudieron cargar las estadísticas. Intenta nuevamente.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      });

    const parametrosOrdenes = new URLSearchParams({ limit: "6" });
    if (filtroEstado) {
      parametrosOrdenes.set("estado", filtroEstado);
    }
    if (busquedaAplicada) {
      parametrosOrdenes.set("search", busquedaAplicada);
    }

    axios
      .get(`/api/ordenes?${parametrosOrdenes.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      .then((respuesta) => {
        setOrdenes(
          Array.isArray(respuesta.data.ordenes) ? respuesta.data.ordenes : [],
        );
      })
      .catch((err) => {
        if (axios.isCancel(err)) {
          return;
        }

        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("usuario");
          navigate("/admin");
          return;
        }

        setErrorOrdenes(
          err.response?.data?.error ||
            "No se pudieron cargar las órdenes recientes.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCargandoOrdenes(false);
        }
      });

    axios
      .get("/api/solicitudes?limit=4&page=1", {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      .then((respuesta) => {
        const solicitudesWeb = Array.isArray(respuesta.data.solicitudes)
          ? respuesta.data.solicitudes
          : [];
        setSolicitudes(solicitudesWeb);
      })
      .catch((err) => {
        if (axios.isCancel(err)) {
          return;
        }

        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("usuario");
          navigate("/admin");
          return;
        }

        setErrorSolicitudes(
          err.response?.data?.error ||
            "No se pudieron cargar las solicitudes de contacto.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCargandoSolicitudes(false);
        }
      });

    return () => controller.abort();
  }, [busquedaAplicada, filtroEstado, navigate, solicitud]);

  const actualizarEstadisticas = () => {
    setCargando(true);
    setCargandoOrdenes(true);
    setCargandoSolicitudes(true);
    setError("");
    setErrorOrdenes("");
    setErrorSolicitudes("");
    setSolicitud((actual) => actual + 1);
  };

  const aplicarBusqueda = (evento) => {
    evento.preventDefault();
    setCargandoOrdenes(true);
    setErrorOrdenes("");
    setBusquedaAplicada(terminoBusqueda.trim());
  };

  const cambiarFiltroEstado = (estado) => {
    setCargandoOrdenes(true);
    setErrorOrdenes("");
    setFiltroEstado(estado);
  };

  const cambiarEstadoOrden = async (id, estado) => {
    setOrdenActualizando(id);
    setErrorOrdenes("");

    try {
      const token = localStorage.getItem("token");
      const respuesta = await axios.patch(
        `/api/ordenes/${id}/estado`,
        { estado },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setOrdenes((actuales) =>
        actuales.map((orden) => (orden.id === id ? respuesta.data : orden)),
      );
      setCargando(true);
      setCargandoOrdenes(true);
      setCargandoSolicitudes(true);
      setSolicitud((actual) => actual + 1);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        navigate("/admin");
        return;
      }

      setErrorOrdenes(
        err.response?.data?.error ||
          "No se pudo actualizar el estado de la orden.",
      );
    } finally {
      setOrdenActualizando(null);
    }
  };

  const aceptarSolicitud = async (id) => {
    setSolicitudAceptando(id);
    setErrorSolicitudes("");

    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `/api/solicitudes/${id}/aceptar`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setCargandoSolicitudes(true);
      setSolicitud((actual) => actual + 1);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        navigate("/admin");
        return;
      }

      setErrorSolicitudes(
        err.response?.data?.error || "No se pudo aceptar la solicitud.",
      );
    } finally {
      setSolicitudAceptando(null);
    }
  };

  const ingresosMes = Number(stats?.ingresos_mes ?? 0);

  return (
    <main className="dashboard">
      <div className="dashboard__container">
        <section className="dashboard__welcome">
          <div>
            <p className="dashboard__eyebrow">RESUMEN DEL TALLER</p>
            <h1>Hola, {nombreUsuario}</h1>
            <p className="dashboard__subtitle">
              Aquí tienes el estado actual de las órdenes de reparación.
            </p>
          </div>
          <div className="dashboard__actions">
            <button
              className="dashboard__refresh"
              type="button"
              onClick={actualizarEstadisticas}
              disabled={cargando}
            >
              <RefreshCw size={17} className={cargando ? "is-spinning" : ""} />
              Actualizar
            </button>
            <button
              className="dashboard__new-order"
              type="button"
              onClick={() => navigate("/nueva-orden")}
            >
              <Plus size={19} />
              Nueva orden
              <ArrowUpRight size={16} />
            </button>
          </div>
        </section>

        <section className="dashboard__stats" aria-label="Órdenes por estado">
          {estados.map(({ label, key, description, Icon, tone }) => (
            <button
              className={`dashboard__stat-card${filtroEstado === key ? " dashboard__stat-card--active" : ""}`}
              key={key}
              type="button"
              onClick={() =>
                cambiarFiltroEstado(filtroEstado === key ? "" : key)
              }
              aria-pressed={filtroEstado === key}
              title={`Filtrar órdenes: ${label}`}
            >
              <div
                className={`dashboard__stat-icon dashboard__stat-icon--${tone}`}
              >
                <Icon size={20} strokeWidth={2} />
              </div>
              <p className="dashboard__stat-label">{label}</p>
              {cargando ? (
                <div className="dashboard__skeleton" aria-label="Cargando" />
              ) : (
                <p className="dashboard__stat-value">
                  {Number(stats?.[key] ?? 0).toLocaleString("es-VE")}
                </p>
              )}
              <p className="dashboard__stat-description">{description}</p>
              <span className="dashboard__stat-hint">
                Ver órdenes <ArrowUpRight size={13} />
              </span>
            </button>
          ))}
        </section>

        {error && (
          <div className="dashboard__error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              onClick={actualizarEstadisticas}
              disabled={cargando}
            >
              Reintentar
            </button>
          </div>
        )}

        <section className="dashboard__revenue" aria-label="Ingresos del mes">
          <div className="dashboard__revenue-copy">
            <span className="dashboard__revenue-icon">
              <ArrowUpRight size={20} />
            </span>
            <div>
              <p>Pagos recibidos este mes</p>
              <span>Abonos registrados por contrato</span>
            </div>
          </div>
          {cargando ? (
            <div
              className="dashboard__revenue-skeleton"
              aria-label="Cargando"
            />
          ) : (
            <p className="dashboard__revenue-amount">
              <MontoDual monto={ingresosMes} />
            </p>
          )}
        </section>

        <section
          className="dashboard__orders"
          aria-labelledby="dashboard-orders-title"
        >
          <div className="dashboard__orders-heading">
            <div>
              <p className="dashboard__eyebrow">SEGUIMIENTO DEL TALLER</p>
              <h2 id="dashboard-orders-title">Órdenes recientes</h2>
              <p>Consulta y actualiza el estado de tus reparaciones.</p>
            </div>
            <button
              className="dashboard__orders-new"
              type="button"
              onClick={() => navigate("/nueva-orden")}
            >
              <Plus size={16} /> Crear orden
            </button>
          </div>

          <div className="dashboard__orders-toolbar">
            <form
              className="dashboard__search"
              onSubmit={aplicarBusqueda}
              role="search"
            >
              <Search size={16} />
              <input
                type="search"
                value={terminoBusqueda}
                onChange={(evento) => setTerminoBusqueda(evento.target.value)}
                placeholder="Buscar por cliente, marca o código"
                aria-label="Buscar órdenes"
              />
              <button type="submit">Buscar</button>
            </form>
            <label className="dashboard__status-filter">
              <span>Estado</span>
              <span className="dashboard__status-select">
                <select
                  value={filtroEstado}
                  onChange={(evento) =>
                    cambiarFiltroEstado(evento.target.value)
                  }
                  aria-label="Filtrar por estado"
                >
                  <option value="">Todos</option>
                  {opcionesEstado.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} />
              </span>
            </label>
          </div>

          {errorOrdenes && (
            <div
              className="dashboard__error dashboard__error--inline"
              role="alert"
            >
              <p>{errorOrdenes}</p>
              <button
                type="button"
                onClick={actualizarEstadisticas}
                disabled={cargandoOrdenes}
              >
                Reintentar
              </button>
            </div>
          )}

          {cargandoOrdenes ? (
            <div className="dashboard__orders-loading">
              <ClipboardList size={20} />
              Cargando órdenes...
            </div>
          ) : ordenes.length === 0 ? (
            <div className="dashboard__orders-empty">
              <span>
                <ClipboardList size={22} />
              </span>
              <strong>No encontramos órdenes</strong>
              <p>
                {filtroEstado || busquedaAplicada
                  ? "Prueba con otro estado o término de búsqueda."
                  : "Cuando registres una reparación, aparecerá aquí."}
              </p>
              {!filtroEstado && !busquedaAplicada && (
                <button type="button" onClick={() => navigate("/nueva-orden")}>
                  Crear primera orden <ArrowRight size={15} />
                </button>
              )}
            </div>
          ) : (
            <div className="dashboard__orders-list">
              {ordenes.map((orden) => {
                const estadoTone =
                  {
                    Recibido: "blue",
                    "En Diagnóstico": "amber",
                    "Esperando Repuesto": "violet",
                    Listo: "green",
                    Entregado: "slate",
                  }[orden.estado] || "slate";

                return (
                  <article className="dashboard__order" key={orden.id}>
                    <span
                      className={`dashboard__order-icon dashboard__order-icon--${estadoTone}`}
                    >
                      <Smartphone size={19} />
                    </span>
                    <div className="dashboard__order-main">
                      <div className="dashboard__order-title">
                        <strong>
                          {orden.equipo_marca} {orden.equipo_modelo}
                        </strong>
                        <span
                          className={`dashboard__order-code dashboard__order-code--${estadoTone}`}
                        >
                          {orden.codigo_seguimiento}
                        </span>
                      </div>
                      <div className="dashboard__order-details">
                        <span>{orden.cliente_nombre || "Cliente"}</span>
                        <span>{formatearFecha(orden.fecha_ingreso)}</span>
                      </div>
                      <p className="dashboard__order-issue">
                        {orden.falla_reportada}
                      </p>
                    </div>
                    <label
                      className={`dashboard__order-status dashboard__order-status--${estadoTone}`}
                    >
                      <span className="dashboard__sr-only">
                        Estado de {orden.codigo_seguimiento}
                      </span>
                      <select
                        value={orden.estado}
                        onChange={(evento) =>
                          cambiarEstadoOrden(orden.id, evento.target.value)
                        }
                        disabled={ordenActualizando === orden.id}
                      >
                        {opcionesEstado.map((estado) => (
                          <option key={estado} value={estado}>
                            {estado}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={13} />
                    </label>
                    {orden.tracking_token ? (
                      <a
                        className="dashboard__order-tracking"
                        href={`/seguimiento/${encodeURIComponent(orden.tracking_token)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Ver enlace privado de seguimiento de la orden ${orden.codigo_seguimiento}`}
                        title="Abrir enlace privado de seguimiento"
                      >
                        <ExternalLink size={14} />
                        <span>Enlace privado</span>
                      </a>
                    ) : (
                      <button
                        className="dashboard__order-tracking"
                        type="button"
                        onClick={() => navigate(`/ordenes/${orden.id}`)}
                        aria-label={`Generar enlace privado de la orden ${orden.codigo_seguimiento}`}
                      >
                        <ExternalLink size={14} />
                        <span>Generar enlace</span>
                      </button>
                    )}
                    {orden.cliente_telefono && (
                      <a
                        className="dashboard__order-call"
                        href={`tel:${orden.cliente_telefono}`}
                        aria-label={`Llamar a ${orden.cliente_nombre || "cliente"}`}
                        title={`Llamar: ${orden.cliente_telefono}`}
                      >
                        <Phone size={16} />
                      </a>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          <div className="dashboard__orders-footer">
            <span>Mostrando hasta 6 órdenes</span>
            <span>Actualiza el estado o abre el seguimiento público</span>
          </div>
        </section>

        <section
          className="dashboard__requests"
          aria-labelledby="dashboard-requests-title"
        >
          <div className="dashboard__requests-heading">
            <div>
              <p className="dashboard__eyebrow">CONTACTO DESDE LA WEB</p>
              <h2 id="dashboard-requests-title">Solicitudes recientes</h2>
            </div>
            <span className="dashboard__requests-count">
              <MessageSquareText size={15} />
              {solicitudes.length}
            </span>
          </div>

          {errorSolicitudes ? (
            <p
              className="dashboard__requests-message dashboard__requests-message--error"
              role="alert"
            >
              {errorSolicitudes}
            </p>
          ) : cargandoSolicitudes ? (
            <p className="dashboard__requests-message">
              Cargando solicitudes...
            </p>
          ) : solicitudes.length === 0 ? (
            <p className="dashboard__requests-message">
              Aún no hay solicitudes. Cuando alguien envíe el formulario de la
              web, aparecerá aquí.
            </p>
          ) : (
            <div className="dashboard__requests-list">
              {solicitudes.map((solicitudWeb) => {
                return (
                  <article className="dashboard__request" key={solicitudWeb.id}>
                    <div className="dashboard__request-avatar">
                      {(solicitudWeb.nombre || "?")
                        .trim()
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div className="dashboard__request-content">
                      <div className="dashboard__request-title">
                        <strong>{solicitudWeb.nombre}</strong>
                        <span>{solicitudWeb.servicio}</span>
                        {solicitudWeb.estado === "Aceptada" && (
                          <span className="dashboard__request-status">
                            Aceptada
                          </span>
                        )}
                      </div>
                      <p>{solicitudWeb.mensaje}</p>
                      <div className="dashboard__request-contact">
                        {solicitudWeb.telefono && (
                          <>
                            <a href={`tel:${solicitudWeb.telefono}`}>
                              <Phone size={13} /> Llamar
                            </a>
                            <a
                              href={`https://wa.me/${telefonoWhatsApp(solicitudWeb.telefono)}?text=${encodeURIComponent(`Hola ${solicitudWeb.nombre}, te contacto desde CopiTech por tu solicitud de ${solicitudWeb.servicio}.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageSquareText size={13} /> WhatsApp
                            </a>
                          </>
                        )}
                        {solicitudWeb.email && (
                          <a href={`mailto:${solicitudWeb.email}`}>
                            <Mail size={13} /> Correo
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="dashboard__request-actions">
                      {solicitudWeb.estado === "Aceptada" ? (
                        solicitudWeb.cliente_id && (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/clientes/${solicitudWeb.cliente_id}`)
                            }
                          >
                            Ver cliente
                            <ArrowRight size={14} />
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          disabled={solicitudAceptando === solicitudWeb.id}
                          onClick={() => aceptarSolicitud(solicitudWeb.id)}
                        >
                          <CheckCircle size={14} />
                          {solicitudAceptando === solicitudWeb.id
                            ? "Aceptando..."
                            : "Aceptar"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="dashboard__footer">
          <span>CopiTech · Gestión de reparaciones</span>
          <span>Tu taller, siempre al día.</span>
        </footer>
      </div>
    </main>
  );
}
