import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Check,
  CheckCircle,
  ChevronRight,
  ClipboardCheck,
  Laptop,
  LoaderCircle,
  Mail,
  Monitor,
  Package,
  Phone,
  Plus,
  Search,
  Smartphone,
  Tablet,
  UserRound,
  X,
} from 'lucide-react';
import './NuevaOrden.css';
import MontoDual from '../components/MontoDual';

const equipoTipos = [
  { value: 'Celular', Icon: Smartphone },
  { value: 'Computador', Icon: Laptop },
  { value: 'Tablet', Icon: Tablet },
  { value: 'Otro', Icon: Monitor },
];

const accesoriosDisponibles = [
  'Cargador',
  'Estuche',
  'Memoria',
  'Cable',
  'Otro accesorio',
];

export default function NuevaOrden() {
  const navigate = useNavigate();
  const [modoCliente, setModoCliente] = useState('existente');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [datosCliente, setDatosCliente] = useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
  });
  const [equipo, setEquipo] = useState({
    tipo: 'Celular',
    marca: '',
    modelo: '',
    numero_serie: '',
    accesorios: [],
    accesorios_otro: '',
    condiciones: '',
    observaciones_recepcion: '',
    falla_reportada: '',
    diagnostico: '',
    presupuesto: '',
    notas: '',
  });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (modoCliente !== 'existente' || !busquedaCliente.trim() || clienteSeleccionado) {
      return undefined;
    }

    const controller = new AbortController();
    const temporizador = window.setTimeout(() => {
      setBuscandoClientes(true);
      axios
        .get(`/api/clientes?search=${encodeURIComponent(busquedaCliente.trim())}&limit=6`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          signal: controller.signal,
        })
        .then(({ data }) => setClientes(Array.isArray(data.clientes) ? data.clientes : []))
        .catch((err) => {
          if (!axios.isCancel(err)) {
            setError(err.response?.data?.error || 'No se pudieron buscar los clientes.');
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setBuscandoClientes(false);
        });
    }, 250);

    return () => {
      window.clearTimeout(temporizador);
      controller.abort();
    };
  }, [busquedaCliente, clienteSeleccionado, modoCliente]);

  const cambiarEquipo = (evento) => {
    const { name, value } = evento.target;
    setEquipo((actual) => ({ ...actual, [name]: value }));
  };

  const cambiarCliente = (evento) => {
    const { name, value } = evento.target;
    setDatosCliente((actual) => ({ ...actual, [name]: value }));
  };

  const cambiarBusquedaCliente = (evento) => {
    const valor = evento.target.value;
    setBusquedaCliente(valor);
    if (!valor.trim()) {
      setClientes([]);
      setBuscandoClientes(false);
    }
  };

  const cambiarModoCliente = (modo) => {
    setModoCliente(modo);
    setClienteSeleccionado(null);
    setBusquedaCliente('');
    setClientes([]);
    setError('');
  };

  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    setBusquedaCliente('');
    setClientes([]);
    setError('');
  };

  const cambiarAccesorio = (accesorio) => {
    setEquipo((actual) => ({
      ...actual,
      accesorios: actual.accesorios.includes(accesorio)
        ? actual.accesorios.filter((item) => item !== accesorio)
        : [...actual.accesorios, accesorio],
    }));
  };

  const guardarOrden = async (evento) => {
    evento.preventDefault();
    setError('');

    if (modoCliente === 'existente' && !clienteSeleccionado) {
      setError('Busca y selecciona un cliente registrado, o elige registrar uno nuevo.');
      return;
    }

    setCargando(true);
    const accesorios = [
      ...equipo.accesorios.filter((accesorio) => accesorio !== 'Otro accesorio'),
      ...(equipo.accesorios.includes('Otro accesorio') && equipo.accesorios_otro.trim()
        ? [equipo.accesorios_otro.trim()]
        : []),
    ];
    try {
      const payload = {
        ...(modoCliente === 'existente'
          ? { cliente_id: clienteSeleccionado.id }
          : {
              cliente: {
                nombre: datosCliente.nombre.trim(),
                telefono: datosCliente.telefono.trim(),
                email: datosCliente.email.trim(),
                direccion: datosCliente.direccion.trim(),
              },
            }),
        equipo_marca: equipo.marca.trim(),
        equipo_modelo: equipo.modelo.trim(),
        tipo_equipo: equipo.tipo,
        numero_serie: equipo.numero_serie.trim(),
        falla_reportada: equipo.falla_reportada.trim(),
        condicion_recepcion: equipo.condiciones.trim(),
        accesorios_recepcion: accesorios.join(', '),
        observaciones_recepcion: equipo.observaciones_recepcion.trim(),
        diagnostico: equipo.diagnostico.trim(),
        notas: equipo.notas.trim(),
        presupuesto: equipo.presupuesto || null,
      };
      const { data } = await axios.post('/api/ordenes', payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      navigate(`/ordenes/${data.id}`, {
        replace: true,
        state: {
          creada: true,
          clienteReutilizado: data.cliente_reutilizado,
          codigo: data.codigo_seguimiento,
        },
      });
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        navigate('/admin');
        return;
      }

      setError(err.response?.data?.error || 'No se pudo registrar la orden. Revisa los datos e inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="intake">
      <div className="intake__container">
        <Link className="intake__back" to="/dashboard"><ArrowLeft size={16} /> Volver al resumen</Link>

        <header className="intake__heading">
          <div className="intake__heading-icon"><ClipboardCheck size={23} /></div>
          <div>
            <p className="intake__eyebrow">RECEPCIÓN EN EL LOCAL</p>
            <h1>Registrar reparación</h1>
            <p>Registra al cliente y deja constancia del equipo tal como lo recibes.</p>
          </div>
          <span className="intake__step-indicator"><span>01</span> Nueva orden</span>
        </header>

        {error && <div className="intake__error" role="alert"><X size={16} />{error}</div>}

        <form className="intake__form" onSubmit={guardarOrden}>
          <section className="intake__section intake__section--customer" aria-labelledby="intake-customer-title">
            <div className="intake__section-heading">
              <span className="intake__section-number">01</span>
              <div>
                <h2 id="intake-customer-title">¿Quién trae el equipo?</h2>
                <p>Selecciona un cliente o crea su ficha durante la recepción.</p>
              </div>
            </div>

            <div className="intake__mode-switch" role="group" aria-label="Tipo de cliente">
              <button
                type="button"
                className={modoCliente === 'existente' ? 'is-selected' : ''}
                onClick={() => cambiarModoCliente('existente')}
              >
                <Search size={15} /> Cliente registrado
              </button>
              <button
                type="button"
                className={modoCliente === 'nuevo' ? 'is-selected' : ''}
                onClick={() => cambiarModoCliente('nuevo')}
              >
                <Plus size={15} /> Registrar cliente nuevo
              </button>
            </div>

            {modoCliente === 'existente' ? (
              clienteSeleccionado ? (
                <div className="intake__selected-client">
                  <span className="intake__selected-avatar"><UserRound size={19} /></span>
                  <div>
                    <strong>{clienteSeleccionado.nombre}</strong>
                    <span><Phone size={13} /> {clienteSeleccionado.telefono}</span>
                    {clienteSeleccionado.email && <span><Mail size={13} /> {clienteSeleccionado.email}</span>}
                  </div>
                  <button type="button" onClick={() => setClienteSeleccionado(null)} aria-label="Cambiar cliente">
                    Cambiar
                  </button>
                </div>
              ) : (
                <div className="intake__customer-search">
                  <label htmlFor="buscar-cliente">Buscar por nombre, teléfono o correo</label>
                  <div className="intake__search-box">
                    <Search size={17} />
                    <input
                      id="buscar-cliente"
                      type="search"
                      value={busquedaCliente}
                      onChange={cambiarBusquedaCliente}
                      placeholder="Ej. María Gómez o 300 123 4567"
                      autoComplete="off"
                    />
                    {buscandoClientes && <LoaderCircle className="intake__spinner" size={16} />}
                  </div>
                  {busquedaCliente.trim() && !buscandoClientes && (
                    <div className="intake__customer-results">
                      {clientes.length > 0 ? clientes.map((cliente) => (
                        <button type="button" key={cliente.id} onClick={() => seleccionarCliente(cliente)}>
                          <span className="intake__customer-avatar">{cliente.nombre.trim().charAt(0).toUpperCase()}</span>
                          <span className="intake__customer-result-copy">
                            <strong>{cliente.nombre}</strong>
                            <small>{cliente.telefono}{cliente.email ? ` · ${cliente.email}` : ''}</small>
                          </span>
                          <ChevronRight size={16} />
                        </button>
                      )) : (
                        <div className="intake__no-results">
                          <span>No encontramos coincidencias.</span>
                          <button type="button" onClick={() => { setDatosCliente((actual) => ({ ...actual, nombre: busquedaCliente.trim() })); cambiarModoCliente('nuevo'); }}>
                            Registrar como nuevo cliente <ArrowLeft size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {!busquedaCliente.trim() && (
                    <p className="intake__helper">Escribe al menos un nombre, teléfono o correo para encontrar un cliente.</p>
                  )}
                </div>
              )
            ) : (
              <div className="intake__fields intake__fields--customer">
                <label className="intake__field intake__field--wide">
                  Nombre completo <span className="intake__required">*</span>
                  <input name="nombre" value={datosCliente.nombre} onChange={cambiarCliente} placeholder="Nombre y apellido" maxLength="100" autoComplete="name" required />
                </label>
                <label className="intake__field">
                  Teléfono <span className="intake__required">*</span>
                  <input name="telefono" type="tel" value={datosCliente.telefono} onChange={cambiarCliente} placeholder="Número de contacto" maxLength="30" autoComplete="tel" required />
                </label>
                <label className="intake__field">
                  Correo electrónico <span className="intake__optional">(opcional)</span>
                  <input name="email" type="email" value={datosCliente.email} onChange={cambiarCliente} placeholder="cliente@correo.com" maxLength="150" autoComplete="email" />
                </label>
                <label className="intake__field intake__field--wide">
                  Dirección <span className="intake__optional">(opcional)</span>
                  <input name="direccion" value={datosCliente.direccion} onChange={cambiarCliente} placeholder="Barrio, ciudad o dirección" maxLength="250" autoComplete="street-address" />
                </label>
                <p className="intake__privacy">Si el teléfono ya existe, la orden se asociará a ese cliente en vez de crear un duplicado.</p>
              </div>
            )}
          </section>

          <section className="intake__section" aria-labelledby="intake-device-title">
            <div className="intake__section-heading">
              <span className="intake__section-number">02</span>
              <div>
                <h2 id="intake-device-title">Datos del equipo</h2>
                <p>Identifica el equipo antes de iniciar el diagnóstico.</p>
              </div>
            </div>

            <div className="intake__device-types" role="group" aria-label="Tipo de equipo">
              {equipoTipos.map(({ value, Icon }) => (
                <button
                  type="button"
                  key={value}
                  className={equipo.tipo === value ? 'is-selected' : ''}
                  onClick={() => setEquipo((actual) => ({ ...actual, tipo: value }))}
                >
                  <Icon size={17} /> {value}
                </button>
              ))}
            </div>

            <div className="intake__fields">
              <label className="intake__field">
                Marca <span className="intake__required">*</span>
                <input name="marca" value={equipo.marca} onChange={cambiarEquipo} placeholder="Ej. Samsung, HP, Apple" maxLength="100" required />
              </label>
              <label className="intake__field">
                Modelo <span className="intake__required">*</span>
                <input name="modelo" value={equipo.modelo} onChange={cambiarEquipo} placeholder="Ej. Galaxy A54, Pavilion 15" maxLength="150" required />
              </label>
              <label className="intake__field intake__field--wide">
                Número de serie / IMEI <span className="intake__optional">(opcional)</span>
                <input name="numero_serie" value={equipo.numero_serie} onChange={cambiarEquipo} placeholder="Identificador del equipo" maxLength="150" />
              </label>
              <label className="intake__field intake__field--wide">
                Falla reportada por el cliente <span className="intake__required">*</span>
                <textarea name="falla_reportada" value={equipo.falla_reportada} onChange={cambiarEquipo} placeholder="¿Qué problema describe el cliente? ¿Cuándo comenzó?" maxLength="2000" rows="3" required />
                <small className="intake__field-hint">Registra lo que informa el cliente; el diagnóstico técnico se puede añadir después.</small>
              </label>
            </div>
          </section>

          <section className="intake__section" aria-labelledby="intake-condition-title">
            <div className="intake__section-heading">
              <span className="intake__section-number">03</span>
              <div>
                <h2 id="intake-condition-title">Condición de recepción</h2>
                <p>Deja constancia de lo que recibes junto con el equipo.</p>
              </div>
            </div>

            <label className="intake__field">
              Estado físico / observaciones visibles
              <textarea name="condiciones" value={equipo.condiciones} onChange={cambiarEquipo} placeholder="Ej. Pantalla con una fisura en esquina superior, carcasa con marcas..." maxLength="1000" rows="2" />
            </label>

            <fieldset className="intake__accessories">
              <legend>Accesorios que deja el cliente</legend>
              <div>
                {accesoriosDisponibles.map((accesorio) => (
                  <label className={`intake__check${equipo.accesorios.includes(accesorio) ? ' is-checked' : ''}`} key={accesorio}>
                    <input type="checkbox" checked={equipo.accesorios.includes(accesorio)} onChange={() => cambiarAccesorio(accesorio)} />
                    <span>{equipo.accesorios.includes(accesorio) && <Check size={12} />}</span>
                    {accesorio}
                  </label>
                ))}
              </div>
              {equipo.accesorios.includes('Otro accesorio') && (
                <input
                  className="intake__other-accessory"
                  value={equipo.accesorios_otro}
                  onChange={(evento) => setEquipo((actual) => ({ ...actual, accesorios_otro: evento.target.value }))}
                  placeholder="Describe el otro accesorio"
                  maxLength="120"
                />
              )}
            </fieldset>
            <label className="intake__field intake__field--wide">
              Observaciones para el comprobante <span className="intake__optional">(opcional)</span>
              <textarea name="observaciones_recepcion" value={equipo.observaciones_recepcion} onChange={cambiarEquipo} placeholder="Detalles adicionales que aparecerán en la constancia para el cliente..." maxLength="2000" rows="2" />
            </label>
          </section>

          <section className="intake__section" aria-labelledby="intake-review-title">
            <div className="intake__section-heading">
              <span className="intake__section-number">04</span>
              <div>
                <h2 id="intake-review-title">Diagnóstico y presupuesto</h2>
                <p>Si aún no los tienes, puedes completar estos datos más adelante.</p>
              </div>
            </div>

            <div className="intake__fields">
              <label className="intake__field intake__field--wide">
                Diagnóstico inicial <span className="intake__optional">(opcional)</span>
                <textarea name="diagnostico" value={equipo.diagnostico} onChange={cambiarEquipo} placeholder="Déjalo vacío si primero debes revisar el equipo." maxLength="5000" rows="2" />
              </label>
              <label className="intake__field">
                Presupuesto estimado (USD) <span className="intake__optional">(opcional)</span>
                <input name="presupuesto" type="number" min="0" step="0.01" value={equipo.presupuesto} onChange={cambiarEquipo} placeholder="Se puede definir después" />
                {equipo.presupuesto !== '' && <MontoDual monto={equipo.presupuesto} />}
              </label>
              <label className="intake__field intake__field--wide">
                Nota interna <span className="intake__optional">(opcional)</span>
                <textarea name="notas" value={equipo.notas} onChange={cambiarEquipo} placeholder="Acuerdos, recomendaciones o detalles internos..." maxLength="3000" rows="2" />
              </label>
            </div>
          </section>

          <aside className="intake__notice">
            <Package size={18} />
            <p><strong>Consejo para la recepción</strong> No solicites ni registres contraseñas personales. Si se requiere desbloquear el equipo, acuerda el procedimiento directamente con el cliente.</p>
          </aside>

          <footer className="intake__footer">
            <Link to="/dashboard">Cancelar</Link>
            <button type="submit" className="intake__submit" disabled={cargando}>
              {cargando ? <LoaderCircle className="intake__spinner" size={17} /> : <CheckCircle size={17} />}
              {cargando ? 'Registrando recepción...' : 'Registrar orden'}
              {!cargando && <ChevronRight size={16} />}
            </button>
          </footer>
        </form>

        <p className="intake__footnote">Al registrar, se genera un código único para hacer seguimiento a esta reparación.</p>
      </div>
    </main>
  );
}
