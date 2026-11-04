// Inventario de unidades de los 4 proyectos (solo administradores). Cada fila abre el registro en HubSpot.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers, RefreshCw, Search, Tag } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { SortHeader } from '../../components/ui/SortHeader.jsx';
import { Field, TextInput } from '../../components/ui/Field.jsx';
import { MultiSelect } from '../../components/ui/MultiSelect.jsx';
import { useSortableTable } from '../../hooks/useSortableTable.js';
import { PROJECTS, HUBSPOT_PORTAL_ID, OBJETO_UNIDADES, unitStatusVariant } from '../../utils/cotizador.js';
import { fetchInventory } from '../../api/cotizador.js';
import { moneda } from '../seguimiento/cotizaciones.js';
import lista from '../../components/ui/Lista.module.css';
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
  const [proyecto, setProyecto] = useState([]);
  const [estado, setEstado] = useState([]);
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
      .filter((u) => !proyecto.length || proyecto.includes(u.proyecto_inmobiliario))
      .filter((u) => !estado.length || estado.includes(u.unit_status))
      .filter((u) => !q || `${u.codigo_unidad || u.id_unidad} ${u.torre} ${u.tipo_vista}`.toLowerCase().includes(q))
      .sort((a, b) => `${a.proyecto_inmobiliario} ${a.codigo_unidad}`.localeCompare(`${b.proyecto_inmobiliario} ${b.codigo_unidad}`, 'es', { numeric: true }));
  }, [unidades, busqueda, proyecto, estado]);

  const { sortedRows, sort, toggleSort } = useSortableTable(filtradas, VALORES);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, proyecto, estado, sort]);

  const hayFiltros = Boolean(busqueda || proyecto.length || estado.length);
  const limpiar = () => {
    setBusqueda('');
    setProyecto([]);
    setEstado([]);
  };
  const desde = (pagina - 1) * PAGE_SIZE;
  const columna = (label, key) => <th><SortHeader label={label} sortKey={key} sort={sort} onSort={toggleSort} /></th>;

  if (cargando && unidades.length === 0) {
    return <div className={lista.page}><p className={lista.mensaje} role="status">Cargando inventario…</p></div>;
  }
  if (error && unidades.length === 0) {
    return (
      <div className={lista.page}>
        <div className={lista.vacio}>
          <p className={lista.error} role="alert">{error}</p>
          <Button variant="secondary" onClick={cargar}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={lista.page}>
      <header className={lista.header}>
        <div>
          <h1 className={lista.title}>Inventario</h1>
          <p className={lista.subtitle}>{filtradas.length} de {unidades.length} unidades · los 4 proyectos</p>
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
            {(p) => <TextInput {...p} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Código, torre o vista…" />}
          </Field>
        </div>
        <Field label={<span className={lista.labelConIcono}><Layers size={13} />Proyecto</span>}>
          {(p) => <MultiSelect {...p} options={PROJECTS} value={proyecto} onChange={setProyecto} placeholder="Todos los proyectos" />}
        </Field>
        <Field label={<span className={lista.labelConIcono}><Tag size={13} />Estado</span>}>
          {(p) => <MultiSelect {...p} options={estados} value={estado} onChange={setEstado} placeholder="Todos los estados" />}
        </Field>
        {hayFiltros && (
          <button type="button" className={lista.limpiar} onClick={limpiar}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className={lista.tableWrap}>
        <table className={`${lista.table} ${styles.tabla}`}>
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
              <tr><td colSpan={12} className={lista.mensaje}>Sin resultados para los filtros aplicados.</td></tr>
            ) : (
              sortedRows.slice(desde, desde + PAGE_SIZE).map((u) => (
                <tr
                  key={u.id}
                  className={lista.filaClicable}
                  tabIndex={0}
                  title="Abrir en HubSpot"
                  onClick={() => window.open(urlRegistro(u.id), '_blank', 'noopener')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') window.open(urlRegistro(u.id), '_blank', 'noopener');
                  }}
                >
                  <td>{u.proyecto_inmobiliario || '—'}</td>
                  <td><span className={lista.nombre}>{u.codigo_unidad || u.id_unidad || '—'}</span></td>
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
        {sortedRows.length > 0 && <Pagination page={pagina} pageSize={PAGE_SIZE} total={sortedRows.length} onPageChange={setPagina} />}
      </div>
    </div>
  );
}
