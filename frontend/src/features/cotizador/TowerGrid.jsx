import { useMemo } from 'react';
import { Badge } from '../../components/ui/Badge.jsx';
import { unitStatusVariant } from '../../utils/cotizador.js';
import styles from './TowerGrid.module.css';
const DISPONIBLE = 'Disponible';
function codigo(u) {
  return u.codigo_unidad || u.id_unidad || '';
}
function compactPrice(v) {
  return v ? `$${Math.round(v / 1_000_000)}M` : '—';
}
function fullPrice(v) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
}
// La posicion (columna) de un apartamento en el piso: los 2 ultimos digitos del codigo (601 -> "01"). Si algun codigo no
// trae esos digitos, cae al orden dentro del piso.
function columnKey(u) {
  const m = codigo(u).match(/(\d{2})\D*$/);
  return m ? m[1] : null;
}
export default function TowerGrid({ units, selectedId, associatedIds, search, vista, onSelect }) {
  const layout = useMemo(() => {
    const keyed = units.every((u) => columnKey(u) !== null);
    const columnas = keyed ? [...new Set(units.map((u) => columnKey(u)))].sort() : [];
    const porPiso = new Map();
    for (const u of units) {
      const lista = porPiso.get(u.piso) ?? [];
      lista.push(u);
      porPiso.set(u.piso, lista);
    }
    const pisos = [...porPiso.keys()]
      .sort((a, b) => b - a)
      .map((piso) => {
        const ordenadas = (porPiso.get(piso) ?? []).sort((a, b) => codigo(a).localeCompare(codigo(b), 'es', { numeric: true }));
        return { piso, celdas: ordenadas };
      });
    const numColumnas = keyed ? columnas.length : Math.max(0, ...pisos.map((p) => p.celdas.length));
    const filas = pisos.map(({ piso, celdas }) => {
      const huecos = Array.from({ length: numColumnas }, () => null);
      celdas.forEach((u, i) => {
        const idx = keyed ? columnas.indexOf(columnKey(u)) : i;
        huecos[idx] = u;
      });
      return { piso, huecos };
    });
    return { filas, numColumnas };
  }, [units]);
  const q = search.trim().toLowerCase();
  const coincide = (u) => (!q || codigo(u).toLowerCase().includes(q) || String(u.piso).includes(q)) && (!vista || (u.tipo_vista || 'Sin vista') === vista);
  if (layout.filas.length === 0) {
    return <p className={styles.vacio}>No hay unidades registradas en esta torre.</p>;
  }
  return (
    <div className={styles.scroll}>
      <div className={styles.grid} style={{ ['--columnas']: layout.numColumnas }}>
        {layout.filas.map(({ piso, huecos }) => (
          <div key={piso} className={styles.fila}>
            <span className={styles.piso}>{piso > 0 ? `Piso ${piso}` : 'Sin piso'}</span>
            {huecos.map((u, i) => {
              if (!u) return <span key={i} className={styles.hueco} aria-hidden="true" />;
              const disponible = u.unit_status === DISPONIBLE;
              const seleccionada = u.id === selectedId;
              const atenuada = disponible && !coincide(u);
              const detalle = [u.alcobas && `${u.alcobas} alc.`, u.area_construida > 0 && `${u.area_construida} m²`, u.tipo_vista].filter(Boolean).join(' · ');
              if (!disponible) {
                const estado = u.unit_status || 'No disponible';
                const detalleEstado = associatedIds.has(u.id) ? `${estado} · asociada a este negocio` : estado;
                return (
                  <span
                    key={u.id}
                    className={`${styles.celda} ${styles.noDisponible}`}
                    title={`${codigo(u)} · ${detalleEstado}`}
                    aria-label={`${codigo(u)}, ${detalleEstado}, no se puede seleccionar`}
                  >
                    <span className={styles.codigo}>{codigo(u)}</span>
                    {u.alcobas && <span className={styles.meta}>{u.alcobas} alc.</span>}
                    <span className={styles.precio}>{compactPrice(u.valor_unidad_comercial || 0)}</span>
                    <Badge variant={unitStatusVariant(u.unit_status)} size="sm">
                      {estado}
                    </Badge>
                  </span>
                );
              }
              return (
                <button
                  key={u.id}
                  type="button"
                  disabled={atenuada}
                  aria-pressed={seleccionada}
                  title={`${codigo(u)} · ${detalle} · ${fullPrice(u.valor_unidad_comercial || 0)}`}
                  onClick={() => onSelect(u)}
                  className={`${styles.celda} ${styles.disponible} ${seleccionada ? styles.seleccionada : ''} ${atenuada ? styles.atenuada : ''}`}
                >
                  <span className={styles.codigo}>{codigo(u)}</span>
                  {u.alcobas && <span className={styles.meta}>{u.alcobas} alc.</span>}
                  <span className={styles.precio}>{compactPrice(u.valor_unidad_comercial || 0)}</span>
                  <Badge variant={unitStatusVariant(u.unit_status)} size="sm" dot>
                    {u.unit_status}
                  </Badge>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
