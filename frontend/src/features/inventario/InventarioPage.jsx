// Inventario de unidades de los 4 proyectos (solo administradores). Cada fila abre el registro en HubSpot.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { SortHeader } from '../../components/ui/SortHeader.jsx';
import { Field, TextInput, Select } from '../../components/ui/Field.jsx';
import { useSortableTable } from '../../hooks/useSortableTable.js';
import { PROJECTS, HUBSPOT_PORTAL_ID, OBJETO_UNIDADES, unitStatusVariant } from '../../utils/cotizador.js';
import { fetchInventory } from '../../api/cotizador.js';
import { moneda } from '../seguimiento/cotizaciones.js';
import styles from './Inventario.module.css';

const PAGE_SIZE = 20;

const urlRegistro = (id) => `https://app.hubspot.com/contacts/${HUBSPOT_PORTAL_ID}/record/${OBJETO_UNIDADES}/${id}`;

// Valor comparable de cada columna ordenable.
const VALORES = {
  proyecto_inmobiliario: (u) => u.proyecto_inmobiliario ?? '',
  codigo_unidad: (u) => u.codigo_unidad || u.id_unidad || '',
  torre: (u) => u.torre ?? '',
  piso: (u) => u.piso ?? 0,
  area_construida: (u) => u.area_construida ?? 0,
  valor_unidad_comercial: (u) => u.valor_unidad_comercial ?? 0,
  valor_m_comercial: (u) => u.valor_m_comercial ?? 0,
  precio_comercial: (u) => (u.valor_unidad_comercial ?? 0) - (u.bono ?? 0),
  bono: (u) => u.bono ?? 0,
  unit_status: (u) => u.unit_status ?? '',
};

export default function InventarioPage() {
  const [unidades, setUnidades] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [proyecto, setProyecto] = useState('');
  const [estado, setEstado] = useState('');
  const [pagina, setPagina] = useState(1);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setUnidades(await fetchInventory());
    } catch {
      setError('No se pudo cargar el inventario.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const estados = useMemo(() => [...new Set(unidades.map((u) => u.unit_status).filter(Boolean))].sort(), [unidades]);

  // Sin orden elegido: por proyecto y codigo.
  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return unidades
      .filter((u) => !proyecto || u.proyecto_inmobiliario === proyecto)
      .filter((u) => !estado || u.unit_status === estado)
      .filter((u) => !q || `${u.codigo_unidad || u.id_unidad} ${u.torre} ${u.tipo_vista}`.toLowerCase().includes(q))
      .sort((a, b) => `${a.proyecto_inmobiliario} ${a.codigo_unidad}`.localeCompare(`${b.proyecto_inmobiliario} ${b.codigo_unidad}`, 'es', { numeric: true }));
  }, [unidades, busqueda, proyecto, estado]);

  const { sortedRows, sort, toggleSort } = useSortableTable(filtradas, VALORES);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, proyecto, estado, sort]);

  const desde = (pagina - 1) * PAGE_SIZE;
  const columna = (label, key) => <th><SortHeader label={label} sortKey={key} sort={sort} onSort={toggleSort} /></th>;

  if (cargando && unidades.length === 0) {
    return <div className={styles.page}><p className={styles.estado} role="status">Cargando inventario…</p></div>;
  }
  if (error && unidades.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.estado}>
          <p className={styles.error} role="alert">{error}</p>
          <Button variant="secondary" onClick={cargar}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Inventario</h1>
          <p className={styles.subtitle}>{filtradas.length} de {unidades.length} unidades · los 4 proyectos</p>
        </div>
        <Button variant="secondary" onClick={cargar} disabled={cargando}>
          <RefreshCw size={16} strokeWidth={1.75} className={cargando ? styles.girar : undefined} aria-hidden="true" />
          Refrescar
        </Button>
      </header>

      <section className={styles.filtros} aria-label="Filtros">
        <Field label="Buscar" className={styles.buscar}>
          {(p) => <TextInput type="search" placeholder="Código, torre o vista…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} {...p} />}
        </Field>
        <Field label="Proyecto">
          {(p) => (
            <Select value={proyecto} onChange={(e) => setProyecto(e.target.value)} {...p}>
              <option value="">Todos los proyectos</option>
              {PROJECTS.map((x) => <option key={x} value={x}>{x}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Estado">
          {(p) => (
            <Select value={estado} onChange={(e) => setEstado(e.target.value)} {...p}>
              <option value="">Todos los estados</option>
              {estados.map((x) => <option key={x} value={x}>{x}</option>)}
            </Select>
          )}
        </Field>
      </section>

      <div className={styles.tablaCard}>
        <div className={styles.tablaWrap}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                {columna('Proyecto', 'proyecto_inmobiliario')}
                {columna('Código', 'codigo_unidad')}
                {columna('Torre', 'torre')}
                {columna('Piso', 'piso')}
                <th>Vista</th>
                <th>Alc. · Baños</th>
                {columna('Área (m²)', 'area_construida')}
                {columna('Valor unidad comercial', 'valor_unidad_comercial')}
                {columna('Precio m²', 'valor_m_comercial')}
                {columna('Precio comercial', 'precio_comercial')}
                {columna('Bono', 'bono')}
                {columna('Estado', 'unit_status')}
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr><td colSpan={12} className={styles.estado}>No hay unidades que coincidan con los filtros.</td></tr>
              ) : (
                sortedRows.slice(desde, desde + PAGE_SIZE).map((u) => (
                  <tr
                    key={u.id}
                    className={styles.fila}
                    tabIndex={0}
                    title="Abrir en HubSpot"
                    onClick={() => window.open(urlRegistro(u.id), '_blank', 'noopener')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') window.open(urlRegistro(u.id), '_blank', 'noopener');
                    }}
                  >
                    <td>{u.proyecto_inmobiliario || '—'}</td>
                    <td><strong>{u.codigo_unidad || u.id_unidad || '—'}</strong></td>
                    <td>{u.torre || '—'}</td>
                    <td>{u.piso || '—'}</td>
                    <td>{u.tipo_vista || '—'}</td>
                    <td>{u.alcobas || '—'} · {u.banos || '—'}{u.estudios ? ` · ${u.estudios} est.` : ''}</td>
                    <td>{u.area_construida || '—'}</td>
                    <td>{moneda(u.valor_unidad_comercial)}</td>
                    <td>{moneda(u.valor_m_comercial)}</td>
                    <td>{moneda(u.valor_unidad_comercial - (u.bono || 0))}</td>
                    <td>{u.bono ? moneda(u.bono) : '—'}</td>
                    <td><Badge variant={unitStatusVariant(u.unit_status)}>{u.unit_status || '—'}</Badge></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={pagina} pageSize={PAGE_SIZE} total={sortedRows.length} onPageChange={setPagina} />
      </div>
    </div>
  );
}
