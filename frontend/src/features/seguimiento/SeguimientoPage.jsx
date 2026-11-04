// Seguimiento de cotizaciones: por defecto agrupadas por negocio (cada fila se expande a sus cotizaciones); con el
// filtro de tipo se pasa a una vista plana de cotizaciones individuales.
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Eye, FileText, Layers, RefreshCw, Search, Trash2, User } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { SortHeader } from '../../components/ui/SortHeader.jsx';
import { Field, TextInput } from '../../components/ui/Field.jsx';
import { MultiSelect } from '../../components/ui/MultiSelect.jsx';
import { useSortableTable } from '../../hooks/useSortableTable.js';
import { useEstadoRetorno } from '../../hooks/useEstadoRetorno.js';
import { useAppConfig } from '../../context/AppConfigContext.jsx';
import { PROJECTS } from '../../utils/cotizador.js';
import { fetchDealsWithQuotes, fetchQuotesByDeal, acceptQuoteAPI, fetchAllQuotes, deleteQuoteAPI, urlPdfCotizacion } from '../../api/cotizador.js';
import { moneda, torreCorta, fechaRelativa, fechaCompleta, estaVencida, numeroCotizacion, generadaPorOtro, coincideBusqueda, resumirPorNegocio } from './cotizaciones.js';
import lista from '../../components/ui/Lista.module.css';
import iconos from '../../components/ui/RowIconButtons.module.css';
import styles from './Seguimiento.module.css';

const PAGE_SIZE = 20;

const TIPOS = [
  { value: 'estandar', label: 'Estándar' },
  { value: 'modelador', label: 'Modelador' },
];
const ESTADOS = [
  { value: 'accepted', label: 'Aceptada' },
  { value: 'pending', label: 'Pendiente' },
];

function BadgeTipo({ tipo }) {
  return <Badge variant={tipo === 'modelador' ? 'info' : 'neutral'}>{tipo}</Badge>;
}

function BadgeEstado({ estado, vencida = false }) {
  if (estado === 'aceptada') return <Badge variant="success" dot>Aceptada</Badge>;
  if (vencida) return <Badge variant="danger">Vencida</Badge>;
  return <Badge variant="warning">Pendiente</Badge>;
}

function Inmueble({ q }) {
  return (
    <div className={styles.dosLineas}>
      <strong>{q.unit_code || '—'}</strong>
      <span className={styles.muted}>
        {torreCorta(q.unit_tower)}
        {q.unit_floor ? ` · P${q.unit_floor}` : ''}
      </span>
    </div>
  );
}

function PorOtro({ q }) {
  if (!generadaPorOtro(q)) return null;
  return (
    <p className={styles.advertencia} title="Generada por un admin sobre este negocio">
      Generó: {q.generated_by_email}
    </p>
  );
}

function Cuota({ q }) {
  return (
    <div className={styles.dosLineas}>
      <span>{moneda(q.monthly_payment)}</span>
      {q.num_installments > 0 && <span className={styles.muted}>{q.num_installments} cuotas</span>}
    </div>
  );
}

function Acciones({ q, esAdmin, vencida, onAceptar, onEliminar }) {
  const puedeAceptar = q.status !== 'aceptada' && (!vencida || esAdmin);
  const forzar = vencida && esAdmin;
  const parar = (fn) => (e) => {
    e.stopPropagation();
    fn();
  };
  return (
    <div className={lista.accionesFila}>
      {q.pdf_filename && (
        <button type="button" className={`${iconos.iconButton} ${iconos.iconButtonPrimary}`} title="Ver PDF" aria-label="Ver PDF" onClick={parar(() => window.open(urlPdfCotizacion(q.id), '_blank'))}>
          <Eye size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
      )}
      {puedeAceptar && (
        <button
          type="button"
          className={`${iconos.iconButton} ${iconos.iconButtonSuccess}`}
          title={forzar ? 'Cotización vencida: aceptar de todas formas (admin)' : 'Aceptar cotización'}
          aria-label="Aceptar cotización"
          onClick={parar(() => onAceptar(q))}
        >
          <Check size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
      {esAdmin && (
        <button type="button" className={`${iconos.iconButton} ${iconos.iconButtonDanger}`} title="Eliminar cotización (admin)" aria-label="Eliminar cotización" onClick={parar(() => onEliminar(q))}>
          <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

// Fila de una cotizacion dentro de un negocio expandido.
function FilaDeNegocio({ q, esAdmin, onAceptar, onEliminar, onAbrir }) {
  const aceptada = q.status === 'aceptada';
  const vencida = !aceptada && estaVencida(q.created_at);
  return (
    <tr
      className={lista.filaClicable}
      onClick={() => onAbrir(q.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAbrir(q.id);
        }
      }}
      tabIndex={0}
    >
      <td>
        <div className={styles.dosLineas}>
          <strong>{fechaRelativa(q.created_at)}</strong>
          <span className={styles.muted}>{fechaCompleta(q.created_at)}</span>
          <span className={styles.muted}>N° {numeroCotizacion(q.pdf_filename)}</span>
          <PorOtro q={q} />
        </div>
      </td>
      <td><Inmueble q={q} /></td>
      <td><BadgeTipo tipo={q.quote_type} /></td>
      <td className={styles.precio}>{moneda(q.total_price)}</td>
      <td>{moneda(q.separation)}</td>
      <td><Cuota q={q} /></td>
      <td>{moneda(q.balance)}</td>
      <td><BadgeEstado estado={q.status} vencida={vencida} /></td>
      <td><Acciones q={q} esAdmin={esAdmin} vencida={vencida} onAceptar={onAceptar} onEliminar={onEliminar} /></td>
    </tr>
  );
}

// Fila de la vista plana (una cotizacion, con su negocio).
function FilaPlana({ q, esAdmin, onAceptar, onEliminar, onAbrir }) {
  const aceptada = q.status === 'aceptada';
  const vencida = !aceptada && estaVencida(q.created_at);
  return (
    <tr
      className={lista.filaClicable}
      onClick={() => onAbrir(q.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAbrir(q.id);
        }
      }}
      tabIndex={0}
    >
      <td><span className={styles.numero}>N° {numeroCotizacion(q.pdf_filename)}</span></td>
      <td>
        <span className={lista.nombre}>{q.deal_name || '—'}</span>
        <PorOtro q={q} />
      </td>
      <td><Inmueble q={q} /></td>
      <td><BadgeTipo tipo={q.quote_type} /></td>
      <td>
        <div className={styles.dosLineas}>
          <strong>{fechaRelativa(q.created_at)}</strong>
          <span className={styles.muted}>{fechaCompleta(q.created_at)}</span>
        </div>
      </td>
      <td className={styles.precio}>{moneda(q.total_price)}</td>
      <td><Cuota q={q} /></td>
      <td><BadgeEstado estado={q.status} vencida={vencida} /></td>
      <td><Acciones q={q} esAdmin={esAdmin} vencida={vencida} onAceptar={onAceptar} onEliminar={onEliminar} /></td>
    </tr>
  );
}

function FilaNegocio({ deal, abierto, cotizaciones, cargando, esAdmin, onAlternar, onAceptar, onEliminar, onAbrir }) {
  const aceptado = deal.has_accepted === 1;
  return (
    <Fragment>
      <tr className={lista.filaClicable} onClick={onAlternar}>
        <td>
          <ChevronRight size={16} strokeWidth={1.75} className={`${styles.chevron} ${abierto ? styles.chevronAbierto : ''}`} aria-hidden="true" />
        </td>
        <td><span className={lista.nombre}>{deal.deal_name || `Negocio ${deal.deal_id}`}</span></td>
        <td>{deal.quote_count}</td>
        <td className={lista.muted}>{fechaRelativa(deal.last_quote_date)}</td>
        <td><BadgeEstado estado={aceptado ? 'aceptada' : 'pendiente'} /></td>
      </tr>
      {abierto && (
        <tr className={styles.sub}>
          <td colSpan={5} className={styles.subCelda}>
            {cargando ? (
              <p className={styles.estado}>Cargando cotizaciones…</p>
            ) : cotizaciones.length === 0 ? (
              <p className={styles.estado}>Sin cotizaciones registradas.</p>
            ) : (
              <table className={lista.table}>
                <thead>
                  <tr>
                    <th>Fecha / N°</th><th>Inmueble</th><th>Tipo</th><th>Precio total</th><th>Separación</th><th>Cuota</th><th>Saldo</th><th>Estado</th><th className={lista.derecha}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cotizaciones.map((q) => (
                    <FilaDeNegocio key={q.id} q={q} esAdmin={esAdmin} onAceptar={onAceptar} onEliminar={onEliminar} onAbrir={onAbrir} />
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </Fragment>
  );
}

export default function SeguimientoPage() {
  const navigate = useNavigate();
  const { role } = useAppConfig();
  const esAdmin = role === 'admin';

  const [negocios, setNegocios] = useState([]);
  const [todas, setTodas] = useState([]);
  const [porNegocio, setPorNegocio] = useState(new Map());
  const [cargandoNegocio, setCargandoNegocio] = useState(new Set());
  const [abiertos, setAbiertos] = useState(new Set());
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const [busqueda, setBusqueda] = useEstadoRetorno('seguimiento:busqueda', '');
  const [tipo, setTipo] = useEstadoRetorno('seguimiento:tipo', []);
  const [estado, setEstado] = useEstadoRetorno('seguimiento:estado', []);
  const [proyecto, setProyecto] = useEstadoRetorno('seguimiento:proyecto', []);
  const [vendedor, setVendedor] = useEstadoRetorno('seguimiento:vendedor', []);
  const [pagina, setPagina] = useEstadoRetorno('seguimiento:pagina', 1);

  const [aAceptar, setAAceptar] = useState(null);
  const [aceptando, setAceptando] = useState(false);
  const [errorAceptar, setErrorAceptar] = useState(null);
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState(null);

  const vistaPlana = tipo.length > 0;
  const hayFiltros = Boolean(busqueda || tipo.length || estado.length || proyecto.length || vendedor.length);
  const limpiar = () => {
    setBusqueda('');
    setTipo([]);
    setEstado([]);
    setProyecto([]);
    setVendedor([]);
  };

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [resumen, cotizaciones] = await Promise.all([fetchDealsWithQuotes(), fetchAllQuotes()]);
      setNegocios(resumen);
      setTodas(cotizaciones);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Con filtro de vendedor o proyecto las cotizaciones de cada negocio salen de `todas` (ya cargadas).
  const filtroEnCliente = vendedor.length > 0 || proyecto.length > 0;
  const cotizacionesDe = (dealId) =>
    filtroEnCliente ? todas.filter((q) => q.deal_id === dealId && (!vendedor.length || vendedor.includes(q.user_email)) && (!proyecto.length || proyecto.includes(q.project))) : porNegocio.get(dealId) ?? [];

  async function alternar(dealId) {
    setAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(dealId)) next.delete(dealId);
      else next.add(dealId);
      return next;
    });
    if (!filtroEnCliente && !porNegocio.has(dealId)) {
      setCargandoNegocio((prev) => new Set(prev).add(dealId));
      try {
        const cotizaciones = await fetchQuotesByDeal(dealId);
        setPorNegocio((prev) => new Map(prev).set(dealId, cotizaciones));
      } finally {
        setCargandoNegocio((prev) => {
          const s = new Set(prev);
          s.delete(dealId);
          return s;
        });
      }
    }
  }

  // Tras aceptar o eliminar se refresca todo lo que depende de la cotizacion.
  async function refrescarTras(dealId) {
    const [resumen, delNegocio, cotizaciones] = await Promise.all([fetchDealsWithQuotes(), fetchQuotesByDeal(dealId), fetchAllQuotes()]);
    setPorNegocio((prev) => new Map(prev).set(dealId, delNegocio));
    setNegocios(resumen);
    setTodas(cotizaciones);
  }

  async function confirmarAceptar() {
    if (!aAceptar) return;
    setAceptando(true);
    try {
      await acceptQuoteAPI(aAceptar.id);
      await refrescarTras(aAceptar.deal_id);
      setAAceptar(null);
    } catch (e) {
      setErrorAceptar(e.message || 'Error al aceptar la cotización. Intenta de nuevo.');
    } finally {
      setAceptando(false);
    }
  }

  async function confirmarEliminar() {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await deleteQuoteAPI(aEliminar.id);
      await refrescarTras(aEliminar.deal_id);
      setAEliminar(null);
    } catch (e) {
      setErrorEliminar(e.message || 'Error al eliminar la cotización. Intenta de nuevo.');
    } finally {
      setEliminando(false);
    }
  }

  // Negocios que coinciden con los filtros (vista agrupada).
  const resumenNegocios = useMemo(() => (filtroEnCliente ? resumirPorNegocio(todas.filter((q) => (!vendedor.length || vendedor.includes(q.user_email)) && (!proyecto.length || proyecto.includes(q.project)))) : negocios), [filtroEnCliente, todas, negocios, vendedor, proyecto]);

  const idsPorBusqueda = useMemo(() => (busqueda.trim() ? new Set(todas.filter((q) => coincideBusqueda(q, busqueda)).map((q) => q.deal_id)) : null), [todas, busqueda]);

  const negociosFiltrados = useMemo(
    () =>
      resumenNegocios
        .filter((d) => {
          if (idsPorBusqueda && !idsPorBusqueda.has(d.deal_id)) return false;
          if (estado.length && !estado.includes(d.has_accepted === 1 ? 'accepted' : 'pending')) return false;
          return true;
        })
        // Sin orden elegido, mas recientes primero.
        .sort((a, b) => (b.last_quote_date ?? '').localeCompare(a.last_quote_date ?? '')),
    [resumenNegocios, idsPorBusqueda, estado]
  );

  const valoresOrden = useMemo(
    () => ({
      deal_name: (d) => d.deal_name ?? '',
      quote_count: (d) => d.quote_count,
      last_quote_date: (d) => d.last_quote_date ?? '',
      status: (d) => d.has_accepted,
    }),
    []
  );
  const { sortedRows: negociosOrdenados, sort, toggleSort } = useSortableTable(negociosFiltrados, valoresOrden);

  const cotizacionesFiltradas = useMemo(
    () =>
      todas.filter((q) => {
        if (tipo.length && !tipo.includes(q.quote_type)) return false;
        if (vendedor.length && !vendedor.includes(q.user_email)) return false;
        if (proyecto.length && !proyecto.includes(q.project)) return false;
        if (!coincideBusqueda(q, busqueda)) return false;
        if (estado.length && !estado.includes(q.status === 'aceptada' ? 'accepted' : 'pending')) return false;
        return true;
      }),
    [todas, tipo, vendedor, proyecto, busqueda, estado]
  );

  // Al cambiar un filtro se vuelve a la primera pagina (no al montar: al volver de un detalle se conserva la pagina).
  const claveFiltros = JSON.stringify([busqueda, tipo, estado, vendedor, proyecto, sort]);
  const claveAnterior = useRef(claveFiltros);
  useEffect(() => {
    if (claveAnterior.current === claveFiltros) return;
    claveAnterior.current = claveFiltros;
    setPagina(1);
  }, [claveFiltros]);

  const vendedores = useMemo(() => [...new Set(todas.map((q) => q.user_email).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')), [todas]);

  const resumen = useMemo(
    () => ({ negocios: negocios.length, aceptados: negocios.filter((d) => d.has_accepted === 1).length, pendientes: negocios.filter((d) => d.has_accepted === 0).length, cotizaciones: todas.length }),
    [negocios, todas]
  );

  const abrir = (id) => navigate(`/seguimiento/${id}`);
  const total = vistaPlana ? cotizacionesFiltradas.length : negociosOrdenados.length;
  const desde = (pagina - 1) * PAGE_SIZE;

  if (cargando && negocios.length === 0) {
    return <div className={lista.page}><p className={lista.mensaje} role="status">Cargando seguimiento…</p></div>;
  }
  if (error && negocios.length === 0) {
    return (
      <div className={lista.page}>
        <div className={lista.vacio}>
          <p className={lista.error} role="alert">{error}</p>
          <Button variant="secondary" onClick={cargar}>Reintentar</Button>
        </div>
      </div>
    );
  }
  if (!cargando && negocios.length === 0) {
    return (
      <div className={lista.page}>
        <div className={lista.vacio}>
          <p className={lista.vacioTitulo}>Sin cotizaciones registradas</p>
          <p className={lista.vacioTexto}>Las cotizaciones generadas desde el cotizador aparecerán aquí.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={lista.page}>
      <header className={lista.header}>
        <div>
          <h1 className={lista.title}>Seguimiento de cotizaciones</h1>
          <p className={lista.subtitle}>
            {resumen.negocios} negocios · {resumen.cotizaciones} cotizaciones · {resumen.aceptados} con cotización aceptada · {resumen.pendientes} pendientes
          </p>
        </div>
        <div className={lista.acciones}>
          <Button variant="secondary" onClick={cargar} disabled={cargando}>
            <span className={lista.botonInterior}>
              <RefreshCw size={16} strokeWidth={1.75} className={cargando ? lista.spin : undefined} aria-hidden="true" />
              Refrescar
            </span>
          </Button>
        </div>
      </header>

      <div className={lista.filtros}>
        <div className={lista.filtroBusqueda}>
          <Field label={<span className={lista.labelConIcono}><Search size={13} />Buscar</span>}>
            {(p) => <TextInput {...p} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Negocio, inmueble o N° de cotización…" />}
          </Field>
        </div>
        <Field label={<span className={lista.labelConIcono}><FileText size={13} />Tipo</span>}>
          {(p) => <MultiSelect {...p} options={TIPOS} value={tipo} onChange={setTipo} placeholder="Todos los tipos" />}
        </Field>
        <Field label={<span className={lista.labelConIcono}><Check size={13} />Estado</span>}>
          {(p) => <MultiSelect {...p} options={ESTADOS} value={estado} onChange={setEstado} placeholder="Todos los estados" />}
        </Field>
        <Field label={<span className={lista.labelConIcono}><Layers size={13} />Proyecto</span>}>
          {(p) => <MultiSelect {...p} options={PROJECTS} value={proyecto} onChange={setProyecto} placeholder="Todos los proyectos" />}
        </Field>
        {esAdmin && (
          <Field label={<span className={lista.labelConIcono}><User size={13} />Vendedor</span>}>
            {(p) => <MultiSelect {...p} options={vendedores} value={vendedor} onChange={setVendedor} placeholder="Todos los vendedores" />}
          </Field>
        )}
        {hayFiltros && (
          <button type="button" className={lista.limpiar} onClick={limpiar}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className={lista.tableWrap}>
        {vistaPlana ? (
          <table className={`${lista.table} ${styles.tablaAncha}`}>
            <thead>
              <tr>
                <th>N°</th><th>Negocio</th><th>Inmueble</th><th>Tipo</th><th>Fecha</th><th>Precio total</th><th>Cuota</th><th>Estado</th><th className={lista.derecha}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cotizacionesFiltradas.length === 0 ? (
                <tr><td colSpan={9} className={lista.mensaje}>Sin resultados para los filtros aplicados.</td></tr>
              ) : (
                cotizacionesFiltradas.slice(desde, desde + PAGE_SIZE).map((q) => (
                  <FilaPlana key={q.id} q={q} esAdmin={esAdmin} onAceptar={(c) => { setAAceptar(c); setErrorAceptar(null); }} onEliminar={(c) => { setAEliminar(c); setErrorEliminar(null); }} onAbrir={abrir} />
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className={`${lista.table} ${styles.tablaAncha}`}>
            <thead>
              <tr>
                <th aria-label="Expandir" />
                <th><SortHeader label="Negocio" sortKey="deal_name" sort={sort} onSort={toggleSort} /></th>
                <th><SortHeader label="# Cotizaciones" sortKey="quote_count" sort={sort} onSort={toggleSort} /></th>
                <th><SortHeader label="Última cotización" sortKey="last_quote_date" sort={sort} onSort={toggleSort} /></th>
                <th><SortHeader label="Estado" sortKey="status" sort={sort} onSort={toggleSort} /></th>
              </tr>
            </thead>
            <tbody>
              {negociosOrdenados.length === 0 ? (
                <tr><td colSpan={5} className={lista.mensaje}>Sin resultados para los filtros aplicados.</td></tr>
              ) : (
                negociosOrdenados.slice(desde, desde + PAGE_SIZE).map((d) => (
                  <FilaNegocio
                    key={d.deal_id}
                    deal={d}
                    abierto={abiertos.has(d.deal_id)}
                    cotizaciones={cotizacionesDe(d.deal_id)}
                    cargando={cargandoNegocio.has(d.deal_id)}
                    esAdmin={esAdmin}
                    onAlternar={() => alternar(d.deal_id)}
                    onAceptar={(c) => { setAAceptar(c); setErrorAceptar(null); }}
                    onEliminar={(c) => { setAEliminar(c); setErrorEliminar(null); }}
                    onAbrir={abrir}
                  />
                ))
              )}
            </tbody>
          </table>
        )}
        {total > 0 && <Pagination page={pagina} pageSize={PAGE_SIZE} total={total} onPageChange={setPagina} />}
      </div>

      <Modal
        open={aAceptar !== null}
        onClose={() => !aceptando && setAAceptar(null)}
        title="¿Aceptar esta cotización?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAAceptar(null)} disabled={aceptando}>Cancelar</Button>
            <Button onClick={confirmarAceptar} disabled={aceptando}>{aceptando ? 'Enviando…' : 'Sí, aceptar'}</Button>
          </>
        }
      >
        <p>Al aceptar esta cotización ocurrirá lo siguiente:</p>
        <ul className={styles.lista}>
          <li>El PDF se <strong>enviará como adjunto</strong> al negocio en HubSpot.</li>
          <li>El <strong>valor del negocio</strong> se actualizará con el precio total.</li>
          <li>Los demás inmuebles asociados serán <strong>desvinculados</strong>, conservando solo el cotizado.</li>
          <li>Si había otra cotización aceptada, será reemplazada por esta.</li>
        </ul>
        {errorAceptar && <p className={styles.error} role="alert">{errorAceptar}</p>}
      </Modal>

      <Modal
        open={aEliminar !== null}
        onClose={() => !eliminando && setAEliminar(null)}
        title="¿Eliminar esta cotización?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAEliminar(null)} disabled={eliminando}>Cancelar</Button>
            <Button variant="danger" onClick={confirmarEliminar} disabled={eliminando}>{eliminando ? 'Eliminando…' : 'Sí, eliminar'}</Button>
          </>
        }
      >
        {aEliminar && (
          <>
            <p>Esta acción es <strong>permanente</strong> y no se puede deshacer. Se borrará el registro y el PDF.</p>
            <div className={styles.recuadro}>
              <strong>{aEliminar.deal_name || '—'}</strong>
              <p className={styles.muted}>{aEliminar.unit_code || '—'} · {aEliminar.quote_type}</p>
              {aEliminar.generated_by_email && <p className={styles.muted}>Generada por: {aEliminar.generated_by_email}</p>}
            </div>
            {errorEliminar && <p className={styles.error} role="alert">{errorEliminar}</p>}
          </>
        )}
      </Modal>
    </div>
  );
}
