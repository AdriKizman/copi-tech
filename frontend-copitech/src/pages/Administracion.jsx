import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ChevronDown,
  KeyRound,
  Plus,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import "./AdminPages.css";
import "./Administracion.css";

function obtenerSesion() {
  try {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
    return usuario && typeof usuario === "object" ? usuario : {};
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {};
    }
    throw error;
  }
}

export default function Administracion() {
  const navigate = useNavigate();
  const usuarioActual = obtenerSesion();
  const [usuarios, setUsuarios] = useState([]);
  const [registroHabilitado, setRegistroHabilitado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    email: "",
    password: "",
  });
  const [usuarioPassword, setUsuarioPassword] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    passwordActual: "",
    passwordNueva: "",
    confirmarPassword: "",
  });

  const usuariosFiltrados = useMemo(() => {
    const filtro = busqueda.trim().toLocaleLowerCase();
    if (!filtro) {
      return usuarios;
    }
    return usuarios.filter((usuario) =>
      `${usuario.nombre} ${usuario.email}`.toLocaleLowerCase().includes(filtro),
    );
  }, [busqueda, usuarios]);

  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      axios.get("/api/auth/usuarios", { headers, signal: controller.signal }),
      axios.get("/api/auth/registro/configuracion", {
        headers,
        signal: controller.signal,
      }),
    ])
      .then(([respuestaUsuarios, respuestaConfiguracion]) => {
        setUsuarios(
          Array.isArray(respuestaUsuarios.data.usuarios)
            ? respuestaUsuarios.data.usuarios
            : [],
        );
        setRegistroHabilitado(respuestaConfiguracion.data.habilitado === true);
      })
      .catch((err) => {
        if (axios.isCancel(err)) {
          return;
        }
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("usuario");
          navigate("/admin", { replace: true });
          return;
        }
        setError(
          err.response?.data?.error ||
            "No se pudo cargar la administración de usuarios.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      });

    return () => controller.abort();
  }, [navigate]);

  const cambiarHabilitacionRegistro = async (evento) => {
    const habilitado = evento.target.checked;
    setGuardando("registro");
    setError("");
    setMensaje("");
    try {
      const token = localStorage.getItem("token");
      const respuesta = await axios.patch(
        "/api/auth/registro/configuracion",
        { habilitado },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setRegistroHabilitado(respuesta.data.habilitado);
      setMensaje(
        respuesta.data.habilitado
          ? "El registro de usuarios quedó habilitado."
          : "El registro de usuarios quedó deshabilitado.",
      );
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        navigate("/admin", { replace: true });
        return;
      }
      setError(
        err.response?.data?.error ||
          "No se pudo cambiar la configuración del registro.",
      );
    } finally {
      setGuardando("");
    }
  };

  const crearUsuario = async (evento) => {
    evento.preventDefault();
    setGuardando("crear");
    setError("");
    setMensaje("");
    try {
      const token = localStorage.getItem("token");
      const respuesta = await axios.post(
        "/api/auth/registro",
        nuevoUsuario,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setUsuarios((actuales) => [respuesta.data.usuario, ...actuales]);
      setNuevoUsuario({ nombre: "", email: "", password: "" });
      setFormularioAbierto(false);
      setMensaje("Cuenta creada con el rol técnico.");
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        navigate("/admin", { replace: true });
        return;
      }
      setError(err.response?.data?.error || "No se pudo crear el usuario.");
    } finally {
      setGuardando("");
    }
  };

  const cambiarRol = async (usuario, rol) => {
    if (
      usuario.rol === "admin" &&
      rol !== "admin" &&
      !window.confirm(`¿Cambiar a ${usuario.nombre} de administrador a técnico?`)
    ) {
      return;
    }

    setGuardando(`rol-${usuario.id}`);
    setError("");
    setMensaje("");
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `/api/auth/usuarios/${usuario.id}/rol`,
        { rol },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setUsuarios((actuales) =>
        actuales.map((actual) =>
          String(actual.id) === String(usuario.id)
            ? { ...actual, rol }
            : actual,
        ),
      );
      setMensaje(`Rol de ${usuario.nombre} actualizado.`);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        navigate("/admin", { replace: true });
        return;
      }
      setError(err.response?.data?.error || "No se pudo actualizar el rol.");
    } finally {
      setGuardando("");
    }
  };

  const cambiarEstado = async (usuario) => {
    const activo = Number(usuario.activo) !== 1;
    if (
      !activo &&
      !window.confirm(
        `¿Desactivar la cuenta de ${usuario.nombre}? Se cerrarán sus sesiones.`,
      )
    ) {
      return;
    }

    setGuardando(`estado-${usuario.id}`);
    setError("");
    setMensaje("");
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `/api/auth/usuarios/${usuario.id}/estado`,
        { activo },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setUsuarios((actuales) =>
        actuales.map((actual) =>
          String(actual.id) === String(usuario.id)
            ? { ...actual, activo: activo ? 1 : 0 }
            : actual,
        ),
      );
      setMensaje(
        activo
          ? `Cuenta de ${usuario.nombre} reactivada.`
          : `Cuenta de ${usuario.nombre} desactivada.`,
      );
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        navigate("/admin", { replace: true });
        return;
      }
      setError(err.response?.data?.error || "No se pudo cambiar el estado.");
    } finally {
      setGuardando("");
    }
  };

  const cambiarPassword = async (evento, usuario) => {
    evento.preventDefault();
    if (passwordForm.passwordNueva !== passwordForm.confirmarPassword) {
      setError("La nueva contraseña y su confirmación no coinciden.");
      return;
    }

    setGuardando(`password-${usuario.id}`);
    setError("");
    setMensaje("");
    try {
      const token = localStorage.getItem("token");
      const respuesta = await axios.patch(
        `/api/auth/usuarios/${usuario.id}/password`,
        {
          passwordActual: passwordForm.passwordActual,
          passwordNueva: passwordForm.passwordNueva,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setPasswordForm({
        passwordActual: "",
        passwordNueva: "",
        confirmarPassword: "",
      });
      setUsuarioPassword(null);

      if (respuesta.data.requiereNuevoLogin) {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        navigate("/admin", {
          replace: true,
          state: { reason: "password-changed" },
        });
        return;
      }
      setMensaje(
        `Contraseña de ${usuario.nombre} cambiada; se cerraron sus sesiones anteriores.`,
      );
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        navigate("/admin", { replace: true });
        return;
      }
      setError(err.response?.data?.error || "No se pudo cambiar la contraseña.");
    } finally {
      setGuardando("");
    }
  };

  const esCuentaActual = (usuario) =>
    String(usuario.id) === String(usuarioActual.id);

  return (
    <main className="admin-page">
      <header className="admin-page__heading">
        <div>
          <p className="admin-page__eyebrow">SEGURIDAD Y ACCESOS</p>
          <h1>Administración</h1>
          <p>Gestiona las cuentas, los permisos y el acceso al sistema.</p>
        </div>
        <span className="admin-users__count">
          <Users size={16} />
          {usuarios.length} usuarios
        </span>
      </header>

      {error && <p className="admin-users__message admin-users__message--error" role="alert">{error}</p>}
      {mensaje && <p className="admin-users__message" role="status">{mensaje}</p>}

      <section className="admin-page__panel admin-users__settings">
        <div className="admin-users__setting-copy">
          <span className="admin-users__icon"><ShieldCheck size={18} /></span>
          <div>
            <h2>Registro de usuarios</h2>
            <p>
              {registroHabilitado
                ? "Habilitado. Los administradores pueden crear cuentas nuevas."
                : "Deshabilitado. No se pueden crear cuentas nuevas."}
            </p>
          </div>
        </div>
        <label className="admin-users__toggle">
          <input
            type="checkbox"
            checked={registroHabilitado}
            disabled={cargando || guardando === "registro"}
            onChange={cambiarHabilitacionRegistro}
            aria-label="Habilitar registro de usuarios"
          />
          <span />
        </label>
      </section>

      <section className="admin-page__panel admin-users__panel">
        <div className="admin-users__toolbar">
          <label className="admin-page__search">
            <Users size={16} />
            <input
              type="search"
              placeholder="Buscar por nombre o correo"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              aria-label="Buscar usuarios"
            />
          </label>
          {registroHabilitado && (
            <button
              className="admin-page__primary-button"
              type="button"
              onClick={() => setFormularioAbierto((abierto) => !abierto)}
            >
              <Plus size={15} />
              {formularioAbierto ? "Cerrar formulario" : "Nuevo usuario"}
            </button>
          )}
        </div>

        {formularioAbierto && registroHabilitado && (
          <form className="admin-users__create-form" onSubmit={crearUsuario}>
            <div className="admin-users__create-heading">
              <UserPlus size={17} />
              <strong>Crear cuenta</strong>
              <span>El rol inicial será técnico.</span>
            </div>
            <label>
              <span>Nombre</span>
              <input
                type="text"
                name="nombre"
                autoComplete="name"
                maxLength={100}
                value={nuevoUsuario.nombre}
                onChange={(evento) =>
                  setNuevoUsuario((actual) => ({
                    ...actual,
                    nombre: evento.target.value,
                  }))
                }
                required
              />
            </label>
            <label>
              <span>Correo electrónico</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                maxLength={254}
                value={nuevoUsuario.email}
                onChange={(evento) =>
                  setNuevoUsuario((actual) => ({
                    ...actual,
                    email: evento.target.value,
                  }))
                }
                required
              />
            </label>
            <label>
              <span>Contraseña inicial</span>
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                value={nuevoUsuario.password}
                onChange={(evento) =>
                  setNuevoUsuario((actual) => ({
                    ...actual,
                    password: evento.target.value,
                  }))
                }
                required
              />
            </label>
            <button
              className="admin-page__primary-button"
              type="submit"
              disabled={guardando === "crear"}
            >
              <UserPlus size={15} />
              {guardando === "crear" ? "Creando..." : "Crear cuenta"}
            </button>
          </form>
        )}

        {cargando ? (
          <p className="admin-users__empty">Cargando usuarios...</p>
        ) : usuariosFiltrados.length === 0 ? (
          <p className="admin-users__empty">
            {usuarios.length === 0
              ? "No hay usuarios para mostrar."
              : "No se encontraron usuarios con esa búsqueda."}
          </p>
        ) : (
          <div className="admin-users__list">
            {usuariosFiltrados.map((usuario) => {
              const esActual = esCuentaActual(usuario);
              const activo = Number(usuario.activo) === 1;
              return (
                <article className="admin-users__user" key={usuario.id}>
                  <div className="admin-users__avatar">
                    {(usuario.nombre || "?").trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="admin-users__identity">
                    <strong>
                      {usuario.nombre}
                      {esActual && <small>Tu cuenta</small>}
                    </strong>
                    <span>{usuario.email}</span>
                  </div>
                  <span
                    className={`admin-users__status${activo ? "" : " admin-users__status--inactive"}`}
                  >
                    {activo ? "Activo" : "Inactivo"}
                  </span>
                  <label className="admin-users__role">
                    <span className="admin-users__sr-only">
                      Rol de {usuario.nombre}
                    </span>
                    <select
                      value={usuario.rol}
                      disabled={esActual || guardando === `rol-${usuario.id}`}
                      onChange={(evento) => cambiarRol(usuario, evento.target.value)}
                      title={
                        esActual
                          ? "No puedes cambiar el rol de tu propia cuenta"
                          : "Cambiar rol"
                      }
                    >
                      <option value="tecnico">Técnico</option>
                      <option value="admin">Administrador</option>
                    </select>
                    <ChevronDown size={13} />
                  </label>
                  <button
                    className="admin-users__action"
                    type="button"
                    disabled={esActual || guardando === `estado-${usuario.id}`}
                    onClick={() => cambiarEstado(usuario)}
                  >
                    {activo ? "Desactivar" : "Reactivar"}
                  </button>
                  <button
                    className="admin-users__action admin-users__action--password"
                    type="button"
                    disabled={!activo || guardando === `password-${usuario.id}`}
                    onClick={() => {
                      setError("");
                      setUsuarioPassword((actual) =>
                        String(actual) === String(usuario.id) ? null : usuario.id,
                      );
                      setPasswordForm({
                        passwordActual: "",
                        passwordNueva: "",
                        confirmarPassword: "",
                      });
                    }}
                  >
                    <KeyRound size={14} />
                    Contraseña
                  </button>

                  {String(usuarioPassword) === String(usuario.id) && (
                    <form
                      className="admin-users__password-form"
                      onSubmit={(evento) => cambiarPassword(evento, usuario)}
                    >
                      <p>
                        Para confirmar este cambio, introduce tu contraseña de
                        administrador. Las sesiones de la cuenta seleccionada se cerrarán.
                      </p>
                      <label>
                        <span>Tu contraseña actual</span>
                        <input
                          type="password"
                          autoComplete="current-password"
                          value={passwordForm.passwordActual}
                          onChange={(evento) =>
                            setPasswordForm((actual) => ({
                              ...actual,
                              passwordActual: evento.target.value,
                            }))
                          }
                          required
                        />
                      </label>
                      <label>
                        <span>Nueva contraseña</span>
                        <input
                          type="password"
                          autoComplete="new-password"
                          minLength={8}
                          maxLength={72}
                          value={passwordForm.passwordNueva}
                          onChange={(evento) =>
                            setPasswordForm((actual) => ({
                              ...actual,
                              passwordNueva: evento.target.value,
                            }))
                          }
                          required
                        />
                      </label>
                      <label>
                        <span>Confirmar nueva contraseña</span>
                        <input
                          type="password"
                          autoComplete="new-password"
                          minLength={8}
                          maxLength={72}
                          value={passwordForm.confirmarPassword}
                          onChange={(evento) =>
                            setPasswordForm((actual) => ({
                              ...actual,
                              confirmarPassword: evento.target.value,
                            }))
                          }
                          required
                        />
                      </label>
                      <button
                        className="admin-page__primary-button"
                        type="submit"
                        disabled={guardando === `password-${usuario.id}`}
                      >
                        <KeyRound size={14} />
                        {guardando === `password-${usuario.id}`
                          ? "Guardando..."
                          : "Guardar contraseña"}
                      </button>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <p className="admin-users__security-note">
        Los cambios de contraseña y desactivación cierran las sesiones existentes.
        No puedes desactivar tu propia cuenta ni quitar el último administrador activo.
      </p>
    </main>
  );
}
