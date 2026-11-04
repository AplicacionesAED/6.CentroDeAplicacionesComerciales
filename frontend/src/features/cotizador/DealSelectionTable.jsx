import { useState, useMemo, useEffect, useRef } from 'react';
import { CircleAlert, Layers, ArrowUpDown, RefreshCw, Search, Flag } from 'lucide-react';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, TextInput, Select } from '../../components/ui/Field.jsx';
import { MultiSelect } from '../../components/ui/MultiSelect.jsx';
import { useEstadoRetorno } from '../../hooks/useEstadoRetorno.js';
import lista from '../../components/ui/Lista.module.css';
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
// ─── Main Component ───────────────────────────────────────────────────────────
export default function DealSelectionTable({ deals, loading, error, onSelect, onRefresh }) {
  const [search, setSearch] = useEstadoRetorno('cotizador:busqueda', '');
  const [stageFilter, setStageFilter] = useEstadoRetorno('cotizador:etapa', []);
  const [projectFilter, setProjectFilter] = useEstadoRetorno('cotizador:proyecto', []);
  const [sort, setSort] = useEstadoRetorno('cotizador:orden', 'actividad');
  const [page, setPage] = useEstadoRetorno('cotizador:pagina', 1);
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
    if (stageFilter.length) result = result.filter((d) => stageFilter.includes(d.dealstage));
    if (projectFilter.length) result = result.filter((d) => projectFilter.includes(d.proyecto_inmobiliario_cac));
    return [...result].sort((a, b) => {
      if (sort === 'nombre') return (a.dealname || '').localeCompare(b.dealname || '', 'es');
      if (sort === 'fecha') return new Date(b.createdate || 0).getTime() - new Date(a.createdate || 0).getTime();
      // 'actividad': prioritise by most recent among lastQuoteDate, lastActivityDate, createdate
      const aDate = a.lastQuoteDate || a.lastActivityDate || a.createdate || '';
      const bDate = b.lastQuoteDate || b.lastActivityDate || b.createdate || '';
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }, [deals, search, stageFilter, projectFilter, sort]);
  // Al cambiar un filtro se vuelve a la primera pagina (no al montar: al volver de un detalle se conserva la pagina).
  const claveFiltros = JSON.stringify([search, stageFilter, projectFilter, sort]);
  const claveAnterior = useRef(claveFiltros);
  useEffect(() => {
    if (claveAnterior.current === claveFiltros) return;
    claveAnterior.current = claveFiltros;
    setPage(1);
  }, [claveFiltros]);
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);
  const activeFilters = Number(stageFilter.length > 0) + Number(projectFilter.length > 0);
  const hayFiltros = Boolean(search.trim()) || activeFilters > 0;
  const limpiarFiltros = () => {
    setSearch('');
    setStageFilter([]);
    setProjectFilter([]);
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
    <div className={lista.page}>
      <header className={lista.header}>
        <div>
          <h1 className={lista.title}>Seleccionar negocio</h1>
          <p className={lista.subtitle}>
            Elige el negocio para el que quieres generar una cotización · {filtered.length} de {deals.length} negocio{deals.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className={lista.acciones}>
          <Button variant="secondary" onClick={onRefresh} disabled={loading} title="Sincroniza la lista con HubSpot para ver cambios recientes">
            <span className={lista.botonInterior}>
              <RefreshCw className={loading ? lista.spin : undefined} size={16} strokeWidth={1.75} aria-hidden="true" />
              Refrescar
            </span>
          </Button>
        </div>
      </header>

      <div className={lista.filtros}>
        <div className={lista.filtroBusqueda}>
          <Field label={<span className={lista.labelConIcono}><Search size={13} />Buscar</span>}>
            {(p) => <TextInput {...p} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Negocio, contacto o proyecto…" />}
          </Field>
        </div>
        {stages.length > 1 && (
          <Field label={<span className={lista.labelConIcono}><Flag size={13} />Etapa</span>}>
            {(p) => <MultiSelect {...p} options={stages} value={stageFilter} onChange={setStageFilter} placeholder="Todas las etapas" />}
          </Field>
        )}
        {projects.length > 1 && (
          <Field label={<span className={lista.labelConIcono}><Layers size={13} />Proyecto</span>}>
            {(p) => <MultiSelect {...p} options={projects} value={projectFilter} onChange={setProjectFilter} placeholder="Todos los proyectos" />}
          </Field>
        )}
        <Field label={<span className={lista.labelConIcono}><ArrowUpDown size={13} />Ordenar por</span>}>
          {(p) => (
            <Select {...p} value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="actividad">Más reciente primero</option>
              <option value="fecha">Fecha de creación</option>
              <option value="nombre">Nombre A → Z</option>
            </Select>
          )}
        </Field>
        {hayFiltros && (
          <button type="button" className={lista.limpiar} onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className={lista.tableWrap}>
        <table className={`${lista.table} ${styles.tabla}`}>
          <thead>
            <tr>
              <th>Negocio / Contacto</th>
              <th>Proyecto</th>
              <th>Etapa</th>
              <th>Última cotización</th>
              <th>Actividad HubSpot</th>
              <th className={lista.derecha}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className={lista.mensaje}>
                  {hayFiltros ? 'Sin resultados para los filtros aplicados.' : 'No tienes negocios asignados.'}
                </td>
              </tr>
            ) : (
              paginated.map((deal) => {
                const hasQuotes = (deal.quoteCount ?? 0) > 0;
                return (
                  <tr
                    key={deal.id}
                    className={lista.filaClicable}
                    onClick={() => onSelect(deal)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSelect(deal);
                    }}
                    tabIndex={0}
                  >
                    <td>
                      <div className={styles.negocio}>
                        <span className={`${styles.punto} ${deal.hasAccepted ? styles.puntoAceptada : hasQuotes ? styles.puntoCotizado : ''}`} />
                        <div className={lista.celdaTitulo}>
                          <span className={lista.nombre}>{deal.dealname || '—'}</span>
                          <span className={lista.detalleSec}>{deal.nombre_contacto || 'Sin contacto'}</span>
                        </div>
                      </div>
                    </td>
                    <td>{deal.proyecto_inmobiliario_cac || <span className={lista.muted}>—</span>}</td>
                    <td>
                      {deal.dealstage ? (
                        <Badge variant={stageVariant(deal.dealstage)} dot>
                          {deal.dealstage}
                        </Badge>
                      ) : (
                        <span className={lista.muted}>—</span>
                      )}
                    </td>
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
                        <span className={lista.muted}>Sin cotizaciones</span>
                      )}
                    </td>
                    <td className={lista.muted}>{relativeTime(deal.lastActivityDate)}</td>
                    <td className={`${lista.derecha} ${styles.destacado}`}>{formatCurrency(deal.amount)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {filtered.length > 0 && (
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
        )}

        {filtered.length > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />}
      </div>

      {loading && deals.length > 0 && (
        <p className={styles.actualizando} role="status">
          Actualizando…
        </p>
      )}
    </div>
  );
}
