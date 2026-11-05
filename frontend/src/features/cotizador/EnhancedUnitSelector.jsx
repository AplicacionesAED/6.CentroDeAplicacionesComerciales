import { useState, useMemo, useEffect } from 'react';
import { ArrowRight, Building2, ChevronLeft, RefreshCw, Search, X } from 'lucide-react';
import { useProjectUnits } from '../../hooks/useProjectUnits.js';
import { fetchTowers } from '../../api/cotizador.js';
import TowerGrid from './TowerGrid.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import styles from './EnhancedUnitSelector.module.css';
function unitPrice(u) {
  return u.valor_unidad_comercial || 0;
}
function formatPrice(v) {
  if (!v) return '—';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
}
// ─── Torre Picker ────────────────────────────────────────────────────────────
function TorrePicker({ towers, availableUnits, loading, onSelect, project }) {
  const torresData = useMemo(
    () =>
      towers
        .map((tower) => {
          const units = availableUnits.filter((u) => tower.unitIds.includes(u.id));
          const prices = units.map(unitPrice).filter((p) => p > 0);
          return {
            ...tower,
            count: units.length,
            minPrice: prices.length ? Math.min(...prices) : Infinity,
            maxPrice: prices.length ? Math.max(...prices) : 0,
          };
        })
        .filter((t) => t.count > 0),
    [towers, availableUnits]
  );
  if (loading) {
    return (
      <div className={styles.cargando} role="status">
        <div className={styles.spinner} />
        <span>Cargando torres…</span>
      </div>
    );
  }
  if (torresData.length === 0) {
    return <p className={styles.vacio}>No hay unidades disponibles en el proyecto {project || ''}.</p>;
  }
  return (
    <div className={styles.bloque}>
      <p className={styles.ayuda}>Selecciona la torre para ver las unidades disponibles:</p>
      <div className={styles.grid}>
        {torresData.map(({ id, name, count, minPrice, maxPrice }) => (
          <button key={id} type="button" onClick={() => onSelect(towers.find((t) => t.id === id))} className={styles.opcion}>
            <div className={styles.opcionHead}>
              <span className={styles.opcionNombre}>{name}</span>
              <Badge variant="info">
                {count} disponible{count !== 1 ? 's' : ''}
              </Badge>
            </div>
            {minPrice !== Infinity && (
              <p className={styles.opcionRango}>{minPrice === maxPrice ? formatPrice(minPrice) : `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`}</p>
            )}
            <span className={styles.opcionVer}>
              Ver unidades
              <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
// ─── Selected Unit Card ───────────────────────────────────────────────────────
function SelectedAvailableCard({ unit, towerName, onChangeUnit }) {
  const price = unitPrice(unit);
  return (
    <div className={styles.resumen}>
      <div className={styles.resumenInfo}>
        <span className={styles.resumenIcono}>
          <Building2 size={18} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className={styles.resumenTexto}>
          <span className={styles.resumenCodigo}>{unit.codigo_unidad || unit.id_unidad}</span>
          <span className={styles.resumenDetalle}>
            {[towerName || unit.torre, unit.piso > 0 && `Piso ${unit.piso}`, unit.tipo_vista].filter(Boolean).join(' · ')}
          </span>
        </div>
      </div>
      <div className={styles.resumenAcciones}>
        <span className={styles.resumenPrecio}>{formatPrice(price)}</span>
        <Button variant="secondary" onClick={onChangeUnit}>
          <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" />
          Cambiar unidad
        </Button>
      </div>
    </div>
  );
}
// ─── Main Component ───────────────────────────────────────────────────────────
export default function EnhancedUnitSelector({ associatedUnits, availableUnits, availableLoading, selectedId, onChange, onRefreshAvailable, project }) {
  const [towers, setTowers] = useState([]);
  const [towersLoading, setTowersLoading] = useState(false);
  const [selectedTowerData, setSelectedTowerData] = useState(null);
  const [search, setSearch] = useState('');
  const [vistaFiltro, setVistaFiltro] = useState('');
  const [searchOpen, setSearchOpen] = useState(true);
  // Todas las unidades del proyecto (cualquier estado): la cuadricula tambien muestra las no disponibles.
  const { units: projectUnits, loading: projectLoading, refresh: refreshProject } = useProjectUnits(project ?? null);
  const associatedIds = new Set(associatedUnits.map((u) => u.id));
  const filteredAvailable = availableUnits.filter((u) => u.unit_status === 'Disponible');
  // Fetch towers on mount
  useEffect(() => {
    setTowersLoading(true);
    fetchTowers()
      .then((torres) => setTowers(torres || []))
      .catch((err) => console.error('Error fetching towers:', err))
      .finally(() => setTowersLoading(false));
  }, []);
  const torreUnits = useMemo(
    () => (selectedTowerData ? filteredAvailable.filter((u) => selectedTowerData.unitIds.includes(u.id)) : filteredAvailable),
    [filteredAvailable, selectedTowerData]
  );
  // Unidades de la torre en cualquier estado; si aun no cargaron, se usan solo las disponibles.
  const gridUnits = useMemo(() => {
    if (!selectedTowerData) return [];
    const todas = projectUnits.filter((u) => selectedTowerData.unitIds.includes(u.id));
    return todas.length > 0 ? todas : torreUnits;
  }, [projectUnits, selectedTowerData, torreUnits]);
  const vistaOpciones = useMemo(() => [...new Set(torreUnits.map((u) => u.tipo_vista || 'Sin vista'))].sort(), [torreUnits]);
  const selectedAvailableUnit = useMemo(
    () => (selectedId ? (filteredAvailable.find((u) => u.id === selectedId) ?? null) : null),
    [filteredAvailable, selectedId]
  );
  const handleSelectUnit = (unit) => {
    onChange(unit.id, true, selectedTowerData?.id ?? null);
    setSearchOpen(false);
  };
  const handleChangeUnit = () => {
    setSearchOpen(true);
  };
  const handleChangeTorre = () => {
    setSelectedTowerData(null);
    setSearch('');
    setVistaFiltro('');
    setSearchOpen(true);
  };
  return (
    <section className={styles.root}>
      <h3 className={styles.titulo}>Seleccionar unidad</h3>

      {/* Las unidades que ya se cotizaron al negocio salen arriba en "Ya cotizados para este cliente" (Recotizar). */}
      <div className={styles.acciones}>
        {onRefreshAvailable && (
          <button
            type="button"
            onClick={() => {
              onRefreshAvailable();
              refreshProject();
            }}
            disabled={availableLoading || projectLoading}
            title="Actualizar desde HubSpot"
            aria-label="Actualizar desde HubSpot"
            className={styles.refrescar}
          >
            <RefreshCw className={availableLoading ? styles.girando : ''} size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* ── Available tab ── */}
      {availableLoading ? (
          <div className={styles.cargando} role="status">
            <div className={styles.spinner} />
            <span>Cargando unidades disponibles…</span>
          </div>
        ) : (
          <div className={styles.bloque}>
            {/* Selected unit collapsed view */}
            {selectedAvailableUnit && !searchOpen && (
              <SelectedAvailableCard unit={selectedAvailableUnit} towerName={selectedTowerData?.name} onChangeUnit={handleChangeUnit} />
            )}

            {/* Search flow (open) */}
            {searchOpen &&
              (!selectedTowerData ? (
                <TorrePicker towers={towers} availableUnits={filteredAvailable} loading={towersLoading} onSelect={setSelectedTowerData} project={project} />
              ) : (
                <div className={styles.bloque}>
                  <div className={styles.migas}>
                    <Button variant="ghost" onClick={handleChangeTorre}>
                      <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
                      Cambiar torre
                    </Button>
                    <span className={styles.sep} aria-hidden="true">
                      ·
                    </span>
                    <span className={styles.migaActual}>{selectedTowerData.name}</span>
                    <span className={styles.migaConteo}>
                      ({torreUnits.length} de {gridUnits.length} disponibles)
                    </span>
                  </div>

                  <div className={styles.buscar}>
                    <Search className={styles.buscarIcono} size={16} strokeWidth={1.75} aria-hidden="true" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar por código de apartamento…"
                      aria-label="Buscar por código de apartamento"
                      className={styles.control}
                    />
                    {search && (
                      <button type="button" onClick={() => setSearch('')} className={styles.buscarLimpiar} aria-label="Borrar búsqueda">
                        <X size={16} strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  {vistaOpciones.length > 1 && (
                    <div className={styles.filtroFila}>
                      <span className={styles.filtroLabel}>Vista</span>
                      <div className={styles.chips}>
                        <button type="button" onClick={() => setVistaFiltro('')} className={`${styles.chip} ${vistaFiltro === '' ? styles.chipActivo : ''}`}>
                          Todas
                        </button>
                        {vistaOpciones.map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setVistaFiltro(vistaFiltro === v ? '' : v)}
                            className={`${styles.chip} ${vistaFiltro === v ? styles.chipActivo : ''}`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {projectLoading && gridUnits === torreUnits ? (
                    <div className={styles.cargando} role="status">
                      <div className={styles.spinner} />
                      <span>Cargando la torre…</span>
                    </div>
                  ) : (
                    <TowerGrid
                      units={gridUnits}
                      selectedId={selectedId}
                      associatedIds={associatedIds}
                      search={search}
                      vista={vistaFiltro}
                      onSelect={handleSelectUnit}
                    />
                  )}
                  <p className={styles.ayuda}>Toca un apartamento disponible para elegirlo. Las unidades en gris ya no están disponibles.</p>
                </div>
              ))}
          </div>
        )}
    </section>
  );
}
