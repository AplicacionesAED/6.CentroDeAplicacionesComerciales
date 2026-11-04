import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { CircleAlert, Info, RefreshCw, Search, X } from 'lucide-react';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import styles from './DealSelectionTable.module.css';
const PAGE_SIZE = 20;
// ─── Helpers ─────────────────────────────────────────────────────────────────
function relativeTime(dateStr) {
  if (!dateStr) return 'Nunca';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? 'Hace un momento' : `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs === 1 ? 'Hace 1 hora' : `Hace ${hrs} horas`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) return `Hace ${Math.floor(days / 7)} sem.`;
  if (days < 365) return `Hace ${Math.floor(days / 30)} mes.`;
  return `Hace ${Math.floor(days / 365)} año(s)`;
}
function formatCurrency(value) {
  if (!value) return '—';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}
function stageVariant(stage) {
  const s = stage.toLowerCase();
  if (s.includes('ganado') || s.includes('won') || s.includes('cerrado') || s.includes('escritura')) return 'success';
  if (s.includes('perdido') || s.includes('lost')) return 'danger';
  if (s.includes('negoci') || s.includes('promesa')) return 'warning';
  if (s.includes('cotiz') || s.includes('propuesta') || s.includes('separac')) return 'info';
  if (s.includes('contact') || s.includes('prospect') || s.includes('primer')) return 'info';
  return 'neutral';
}
// ─── Tooltip (portal-based to escape overflow clipping) ──────────────────────
function Tooltip({ text, children }) {
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const show = useCallback(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ x: r.left + r.width / 2, y: r.top });
  }, []);
  const hide = useCallback(() => setPos(null), []);
  return (
    <span ref={ref} style={{ display: 'inline-flex', alignItems: 'center' }} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {pos &&
        createPortal(
          <span role="tooltip" className={`aed-chrome ${styles.burbuja}`} style={{ left: pos.x, top: pos.y - 8, transform: 'translate(-50%, -100%)' }}>
            {text}
          </span>,
          document.body
        )}
    </span>
  );
}
function InfoIcon({ tip }) {
  return (
    <Tooltip text={tip}>
      <span className={styles.infoDisparador} tabIndex={0} aria-label={tip}>
        <Info size={14} strokeWidth={1.75} aria-hidden="true" />
      </span>
    </Tooltip>
  );
}
// ─── Main Component ───────────────────────────────────────────────────────────
export default function DealSelectionTable({ deals, loading, error, onSelect, onRefresh }) {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [sort, setSort] = useState('actividad');
  const [page, setPage] = useState(1);
  // Unique stage and project options extracted from deal list
  const stages = useMemo(() => {
    const s = new Set(deals.map((d) => d.dealstage).filter(Boolean));
    return Array.from(s).sort();
  }, [deals]);
  const projects = useMemo(() => {
    const p = new Set(deals.map((d) => d.proyecto_inmobiliario_cac).filter(Boolean));
    return Array.from(p).sort();
  }, [deals]);
  const filtered = useMemo(() => {
    let result = deals;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) => d.dealname?.toLowerCase().includes(q) || d.nombre_contacto?.toLowerCase().includes(q) || d.proyecto_inmobiliario_cac?.toLowerCase().includes(q)
      );
    }
    if (stageFilter) result = result.filter((d) => d.dealstage === stageFilter);
    if (projectFilter) result = result.filter((d) => d.proyecto_inmobiliario_cac === projectFilter);
    return [...result].sort((a, b) => {
      if (sort === 'nombre') return (a.dealname || '').localeCompare(b.dealname || '', 'es');
      if (sort === 'fecha') return new Date(b.createdate || 0).getTime() - new Date(a.createdate || 0).getTime();
      // 'actividad': prioritise by most recent among lastQuoteDate, lastActivityDate, createdate
      const aDate = a.lastQuoteDate || a.lastActivityDate || a.createdate || '';
      const bDate = b.lastQuoteDate || b.lastActivityDate || b.createdate || '';
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }, [deals, search, stageFilter, projectFilter, sort]);
  useEffect(() => {
    setPage(1);
  }, [search, stageFilter, projectFilter, sort]);
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);
  const activeFilters = [stageFilter, projectFilter].filter(Boolean).length;
  const limpiarFiltros = () => {
    setSearch('');
    setStageFilter('');
    setProjectFilter('');
  };
  // ─── Loading ───
  if (loading && deals.length === 0) {
    return (
      <div className={styles.centro} role="status">
        <div className={styles.spinner} />
        <p>Cargando negocios…</p>
      </div>
    );
  }
  // ─── Error ───
  if (error) {
    return (
      <div className={styles.centro} role="alert">
        <span className={styles.errorIcono}>
          <CircleAlert size={28} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <h2 className={styles.errorTitulo}>Error al cargar negocios</h2>
        <p>{error}</p>
        <Button variant="secondary" onClick={onRefresh}>
          Reintentar
        </Button>
      </div>
    );
  }
  return (
    <div className={styles.root}>
      {/* ── Header ── */}
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Seleccionar negocio</h2>
          <p className={styles.subtitle}>Elige el negocio para el que quieres generar una cotización</p>
        </div>

        <div className={styles.headAcciones}>
          {/* Sort selector */}
          <Tooltip text="Elige cómo ordenar la lista de negocios">
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar negocios" className={`${styles.control} ${styles.select}`}>
              <option value="actividad">Más reciente primero</option>
              <option value="fecha">Por fecha de creación</option>
              <option value="nombre">Nombre A → Z</option>
            </select>
          </Tooltip>

          {/* Refresh */}
          <Tooltip text="Sincroniza la lista con HubSpot para ver cambios recientes">
            <Button variant="secondary" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={loading ? styles.girando : ''} size={16} strokeWidth={1.75} aria-hidden="true" />
              Refrescar
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* ── Search ── */}
      <div className={styles.buscar}>
        <Search className={styles.buscarIcono} size={16} strokeWidth={1.75} aria-hidden="true" />
        <input
          type="text"
          placeholder="Buscar por nombre del negocio, contacto o proyecto…"
          aria-label="Buscar negocios"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${styles.control} ${styles.buscarInput}`}
        />
        {search && (
          <button type="button" onClick={() => setSearch('')} className={styles.buscarLimpiar} aria-label="Borrar búsqueda">
            <X size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* ── Filter chips ── */}
      {(stages.length > 1 || projects.length > 1) && (
        <div className={styles.filtros}>
          {/* Stage filters */}
          {stages.length > 1 && (
            <div className={styles.filtroFila}>
              <span className={styles.filtroLabel}>
                Etapa
                <InfoIcon tip="Filtra los negocios por la etapa en que se encuentran dentro del pipeline de ventas" />
              </span>
              <button type="button" onClick={() => setStageFilter('')} className={`${styles.chip} ${!stageFilter ? styles.chipActivo : ''}`}>
                Todas
              </button>
              {stages.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStageFilter(stageFilter === s ? '' : s)}
                  className={`${styles.chip} ${stageFilter === s ? styles.chipActivo : ''}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Project filters */}
          {projects.length > 1 && (
            <div className={styles.filtroFila}>
              <span className={styles.filtroLabel}>
                Proyecto
                <InfoIcon tip="Filtra los negocios por el proyecto inmobiliario de interés del cliente" />
              </span>
              <button type="button" onClick={() => setProjectFilter('')} className={`${styles.chip} ${!projectFilter ? styles.chipActivo : ''}`}>
                Todos
              </button>
              {projects.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProjectFilter(projectFilter === p ? '' : p)}
                  className={`${styles.chip} ${projectFilter === p ? styles.chipActivo : ''}`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Active filter banner ── */}
      {(activeFilters > 0 || search) && (
        <div className={styles.aviso} role="status">
          <span>
            Mostrando {filtered.length} de {deals.length} negocios
            {activeFilters > 0 && ` · ${activeFilters} filtro${activeFilters > 1 ? 's' : ''} activo${activeFilters > 1 ? 's' : ''}`}
          </span>
          <button type="button" onClick={limpiarFiltros} className={styles.enlace}>
            Limpiar filtros
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div className={styles.card}>
        <div className={styles.scroll}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>
                  <span className={styles.thContenido}>
                    Negocio / Contacto
                    <InfoIcon tip="Nombre del negocio en HubSpot y el nombre del contacto asociado" />
                  </span>
                </th>
                <th>
                  <span className={styles.thContenido}>
                    Proyecto
                    <InfoIcon tip="Proyecto inmobiliario de interés registrado en el negocio" />
                  </span>
                </th>
                <th>
                  <span className={styles.thContenido}>
                    Etapa
                    <InfoIcon tip="Etapa actual del negocio dentro del pipeline de ventas de HubSpot" />
                  </span>
                </th>
                <th>
                  <span className={styles.thContenido}>
                    Última cotización
                    <InfoIcon tip="Cuándo se generó la última cotización para este negocio en esta app. El número indica cuántas cotizaciones tiene registradas." />
                  </span>
                </th>
                <th>
                  <span className={styles.thContenido}>
                    Actividad HubSpot
                    <InfoIcon tip="Última actividad registrada en HubSpot para este negocio (llamadas, emails, reuniones, etc.)" />
                  </span>
                </th>
                <th className={styles.derecha}>
                  <span className={styles.thContenido}>
                    Valor
                    <InfoIcon tip="Valor total del negocio registrado en HubSpot" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.vacioFila}>
                    <div className={styles.vacio}>
                      <span className={styles.vacioIcono}>
                        <Search size={20} strokeWidth={1.5} aria-hidden="true" />
                      </span>
                      <p>{search || activeFilters > 0 ? 'No hay negocios con esos filtros' : 'No tienes negocios asignados'}</p>
                      {(search || activeFilters > 0) && (
                        <button type="button" onClick={limpiarFiltros} className={styles.enlace}>
                          Limpiar filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((deal) => {
                  const hasQuotes = (deal.quoteCount ?? 0) > 0;
                  return (
                    <tr
                      key={deal.id}
                      onClick={() => onSelect(deal)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onSelect(deal);
                      }}
                      tabIndex={0}
                      className={styles.fila}
                    >
                      {/* Negocio / Contacto */}
                      <td>
                        <div className={styles.negocio}>
                          {/* Punto: verde si tiene cotización aceptada, azul si tiene cotizaciones, gris si no */}
                          <span className={`${styles.punto} ${deal.hasAccepted ? styles.puntoAceptada : hasQuotes ? styles.puntoCotizado : ''}`} />
                          <div>
                            <span className={styles.nombre}>{deal.dealname || '—'}</span>
                            <span className={styles.contacto}>{deal.nombre_contacto || 'Sin contacto'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Proyecto */}
                      <td className={styles.muted}>{deal.proyecto_inmobiliario_cac || '—'}</td>

                      {/* Etapa */}
                      <td>
                        {deal.dealstage ? (
                          <Badge variant={stageVariant(deal.dealstage)} dot>
                            {deal.dealstage}
                          </Badge>
                        ) : (
                          <span className={styles.muted}>—</span>
                        )}
                      </td>

                      {/* Última cotización (local) */}
                      <td>
                        {hasQuotes ? (
                          <div>
                            <span className={styles.destacado}>{relativeTime(deal.lastQuoteDate)}</span>
                            <span className={styles.nota}>
                              {deal.quoteCount} cotización{(deal.quoteCount ?? 0) > 1 ? 'es' : ''}
                              {deal.hasAccepted && <span className={styles.notaExito}> · Aceptada</span>}
                            </span>
                          </div>
                        ) : (
                          <span className={styles.muted}>Sin cotizaciones</span>
                        )}
                      </td>

                      {/* Actividad HubSpot */}
                      <td className={styles.muted}>{relativeTime(deal.lastActivityDate)}</td>

                      {/* Valor */}
                      <td className={`${styles.derecha} ${styles.destacado}`}>{formatCurrency(deal.amount)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        {filtered.length > 0 && (
          <div className={styles.pie}>
            <div className={styles.leyenda}>
              <span className={styles.leyendaItem}>
                <span className={`${styles.punto} ${styles.puntoAceptada}`} /> Cotización aceptada
              </span>
              <span className={styles.leyendaItem}>
                <span className={`${styles.punto} ${styles.puntoCotizado}`} /> Con cotizaciones
              </span>
              <span className={styles.leyendaItem}>
                <span className={styles.punto} /> Sin cotizaciones
              </span>
            </div>
            <span>
              {filtered.length} de {deals.length} negocio{deals.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
      </div>

      {loading && deals.length > 0 && (
        <p className={styles.actualizando} role="status">
          Actualizando…
        </p>
      )}
    </div>
  );
}
