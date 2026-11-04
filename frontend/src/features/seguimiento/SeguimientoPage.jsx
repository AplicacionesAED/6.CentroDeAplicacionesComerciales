// Seguimiento de cotizaciones: por defecto agrupadas por negocio (cada fila se expande a sus cotizaciones); con el
// filtro de tipo se pasa a una vista plana de cotizaciones individuales.
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Eye, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { SortHeader } from '../../components/ui/SortHeader.jsx';
import { Field, TextInput, Select } from '../../components/ui/Field.jsx';
import { useSortableTable } from '../../hooks/useSortableTable.js';
import { useAppConfig } from '../../context/AppConfigContext.jsx';
import { PROJECTS } from '../../utils/cotizador.js';
import { fetchDealsWithQuotes, fetchQuotesByDeal, acceptQuoteAPI, fetchAllQuotes, deleteQuoteAPI, urlPdfCotizacion } from '../../api/cotizador.js';
import { moneda, torreCorta, fechaRelativa, fechaCompleta, estaVencida, numeroCotizacion, generadaPorOtro, coincideBusqueda, resumirPorNegocio } from './cotizaciones.js';
import styles from './Seguimiento.module.css';

const PAGE_SIZE = 20;

const TIPOS = [
  { value: '', label: 'Todos' },
  { value: 'estandar', label: 'Estándar' },
  { value: 'modelador', label: 'Modelador' },
];
const ESTADOS = [
  { value: '', label: 'Todos' },
  { value: 'accepted', label: 'Aceptada' },
  { value: 'pending', label: 'Pendiente' },
];

function Segmentos({ opciones, valor, onChange, etiqueta }) {
  return (
    <div className={styles.segmentos} role="group" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button key={o.value} type="button" aria-pressed={valor === o.value} className={`${styles.segmento} ${valor === o.value ? styles.segmentoActivo : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

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
    <div className={styles.acciones}>
      {q.pdf_filename && (
        <button type="button" className={styles.accion} title="Ver PDF" aria-label="Ver PDF" onClick={parar(() => window.open(urlPdfCotizacion(q.id), '_blank'))}>
          <Eye size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
      )}
      {puedeAceptar && (
        <button
          type="button"
          className={`${styles.accion} ${forzar ? styles.accionForzar : styles.accionAceptar}`}
          title={forzar ? 'Cotización vencida: aceptar de todas formas (admin)' : 'Aceptar cotización'}
          aria-label="Aceptar cotización"
          onClick={parar(() => onAceptar(q))}
        >
          <Check size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
      {esAdmin && (
        <button type="button" className={`${styles.accion} ${styles.accionEliminar}`} title="Eliminar cotización (admin)" aria-label="Eliminar cotización" onClick={parar(() => onEliminar(q))}>
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
      className={`${styles.cotizacion} ${aceptada ? styles.cotizacionAceptada : vencida ? styles.cotizacionVencida : ''}`}
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
      className={`${styles.cotizacion} ${aceptada ? styles.cotizacionAceptada : vencida ? styles.cotizacionVencida : ''}`}
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
        <span className={styles.nombre}>{q.deal_name || '—'}</span>
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
      <tr className={`${styles.negocio} ${abierto ? styles.negocioAbierto : ''} ${aceptado ? styles.negocioAceptado : ''}`} onClick={onAlternar}>
        <td>
          <ChevronRight size={16} strokeWidth={1.75} className={`${styles.chevron} ${abierto ? styles.chevronAbierto : ''}`} aria-hidden="true" />
        </td>
        <td><span className={styles.nombre}>{deal.deal_name || `Negocio ${deal.deal_id}`}</span></td>
        <td>{deal.quote_count}</td>
        <td className={styles.muted}>{fechaRelativa(deal.last_quote_date)}</td>
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
              <table className={styles.subTabla}>
                <thead>
                  <tr>
                    <th>Fecha / N°</th><th>Inmueble</th><th>Tipo</th><th>Precio total</th><th>Separación</th><th>Cuota</th><th>Saldo</th><th>Estado</th><th className={styles.derecha}>Acciones</th>
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

  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');
  const [proyecto, setProyecto] = useState('');
  const [vendedor, setVendedor] = useState('');
  const [pagina, setPagina] = useState(1);

  const [aAceptar, setAAceptar] = useState(null);
  const [aceptando, setAceptando] = useState(false);
  const [errorAceptar, setErrorAceptar] = useState(null);
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState(null);

  const vistaPlana = Boolean(tipo);
  const hayFiltros = Boolean(busqueda || tipo || estado || proyecto || vendedor);
  const limpiar = () => {
    setBusqueda('');
    setTipo('');
    setEstado('');
    setProyecto('');
    setVendedor('');
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
  const filtroEnCliente = Boolean(vendedor || proyecto);
  const cotizacionesDe = (dealId) =>
    filtroEnCliente ? todas.filter((q) => q.deal_id === dealId && (!vendedor || q.user_email === vendedor) && (!proyecto || q.project === proyecto)) : porNegocio.get(dealId) ?? [];

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
  const resumenNegocios = useMemo(() => (filtroEnCliente ? resumirPorNegocio(todas.filter((q) => (!vendedor || q.user_email === vendedor) && (!proyecto || q.project === proyecto))) : negocios), [filtroEnCliente, todas, negocios, vendedor, proyecto]);

  const idsPorBusqueda = useMemo(() => (busqueda.trim() ? new Set(todas.filter((q) => coincideBusqueda(q, busqueda)).map((q) => q.deal_id)) : null), [todas, busqueda]);

  const negociosFiltrados = useMemo(
    () =>
      resumenNegocios
        .filter((d) => {
          if (idsPorBusqueda && !idsPorBusqueda.has(d.deal_id)) return false;
          if (estado === 'accepted' && d.has_accepted !== 1) return false;
          if (estado === 'pending' && d.has_accepted === 1) return false;
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
        if (tipo && q.quote_type !== tipo) return false;
        if (vendedor && q.user_email !== vendedor) return false;
        if (proyecto && q.project !== proyecto) return false;
        if (!coincideBusqueda(q, busqueda)) return false;
        if (estado === 'accepted' && q.status !== 'aceptada') return false;
        if (estado === 'pending' && q.status !== 'pendiente') return false;
        return true;
      }),
    [todas, tipo, vendedor, proyecto, busqueda, estado]
  );

  useEffect(() => {
    setPagina(1);
  }, [busqueda, tipo, estado, vendedor, proyecto, sort]);

  const vendedores = useMemo(() => [...new Set(todas.map((q) => q.user_email).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')), [todas]);

  const resumen = useMemo(
    () => ({ negocios: negocios.length, aceptados: negocios.filter((d) => d.has_accepted === 1).length, pendientes: negocios.filter((d) => d.has_accepted === 0).length, cotizaciones: todas.length }),
    [negocios, todas]
  );

  const abrir = (id) => navigate(`/seguimiento/${id}`);
  const total = vistaPlana ? cotizacionesFiltradas.length : negociosOrdenados.length;
  const desde = (pagina - 1) * PAGE_SIZE;

  if (cargando && negocios.length === 0) {
    return <div className={styles.page}><p className={styles.estado} role="status">Cargando seguimiento…</p></div>;
  }
  if (error && negocios.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.estado}>
          <p className={styles.error} role="alert">{error}</p>
          <Button variant="secondary" onClick={cargar}>Reintentar</Button>
        </div>
      </div>
    );
  }
  if (!cargando && negocios.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.estado}>
          <h2 className={styles.estadoTitulo}>Sin cotizaciones registradas</h2>
          <p>Las cotizaciones generadas desde el cotizador aparecerán aquí.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Seguimiento de cotizaciones</h1>
          <p className={styles.resumen}>
            <span>{resumen.negocios} negocios · {resumen.cotizaciones} cotizaciones</span>
            <span className={styles.resumenOk}>{resumen.aceptados} con cotización aceptada</span>
            <span className={styles.resumenPend}>{resumen.pendientes} pendientes</span>
          </p>
        </div>
        <Button variant="secondary" onClick={cargar} disabled={cargando}>
          <RefreshCw size={16} strokeWidth={1.75} className={cargando ? styles.girar : undefined} aria-hidden="true" />
          Refrescar
        </Button>
      </header>

      <section className={styles.filtros} aria-label="Filtros">
        <div className={styles.filtrosFila}>
          <Field label="Buscar" className={styles.buscar}>
            {(p) => <TextInput type="search" placeholder="Negocio / inmueble / N° de cotización…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} {...p} />}
          </Field>
          <div className={styles.grupo}>
            <span className={styles.grupoLabel}>Tipo</span>
            <Segmentos etiqueta="Tipo de cotización" opciones={TIPOS} valor={tipo} onChange={setTipo} />
          </div>
          <div className={styles.grupo}>
            <span className={styles.grupoLabel}>Estado</span>
            <Segmentos etiqueta="Estado" opciones={ESTADOS} valor={estado} onChange={setEstado} />
          </div>
          <Field label="Proyecto">
            {(p) => (
              <Select value={proyecto} onChange={(e) => setProyecto(e.target.value)} {...p}>
                <option value="">Todos</option>
                {PROJECTS.map((x) => <option key={x} value={x}>{x}</option>)}
              </Select>
            )}
          </Field>
          {esAdmin && (
            <Field label="Vendedor">
              {(p) => (
                <Select value={vendedor} onChange={(e) => setVendedor(e.target.value)} {...p}>
                  <option value="">Todos</option>
                  {vendedores.map((email) => <option key={email} value={email}>{email}</option>)}
                </Select>
              )}
            </Field>
          )}
          {hayFiltros && <Button variant="ghost" onClick={limpiar}>Limpiar</Button>}
        </div>
        {vistaPlana ? (
          <p className={styles.conteo}>Vista de cotizaciones individuales: <strong>{cotizacionesFiltradas.length}</strong> resultado{cotizacionesFiltradas.length !== 1 ? 's' : ''}</p>
        ) : (
          hayFiltros && <p className={styles.conteo}><strong>{negociosFiltrados.length}</strong> de {resumenNegocios.length} negocios</p>
        )}
      </section>

      <div className={styles.tablaCard}>
        <div className={styles.tablaWrap}>
          {vistaPlana ? (
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th>N°</th><th>Negocio</th><th>Inmueble</th><th>Tipo</th><th>Fecha</th><th>Precio total</th><th>Cuota</th><th>Estado</th><th className={styles.derecha}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cotizacionesFiltradas.length === 0 ? (
                  <tr><td colSpan={9} className={styles.estado}>No se encontraron cotizaciones con los filtros aplicados.</td></tr>
                ) : (
                  cotizacionesFiltradas.slice(desde, desde + PAGE_SIZE).map((q) => (
                    <FilaPlana key={q.id} q={q} esAdmin={esAdmin} onAceptar={(c) => { setAAceptar(c); setErrorAceptar(null); }} onEliminar={(c) => { setAEliminar(c); setErrorEliminar(null); }} onAbrir={abrir} />
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className={styles.tabla}>
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
                  <tr><td colSpan={5} className={styles.estado}>No se encontraron negocios con los filtros aplicados.</td></tr>
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
        </div>
        <Pagination page={pagina} pageSize={PAGE_SIZE} total={total} onPageChange={setPagina} />
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
