// Negocios en etapa 6 o posterior de su pipeline (en tramite). Es el unico lugar donde se generan los anexos
// de una cotizacion aceptada.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers, RefreshCw, Search } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Field, TextInput } from '../../components/ui/Field.jsx';
import { MultiSelect } from '../../components/ui/MultiSelect.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { PROJECTS } from '../../utils/cotizador.js';
import { fetchTramites } from '../../api/cotizador.js';
import { moneda } from '../seguimiento/cotizaciones.js';
import GenerarAnexosButton from '../seguimiento/GenerarAnexosButton.jsx';
import lista from '../../components/ui/Lista.module.css';
import styles from './Tramites.module.css';

const PAGE_SIZE = 20;

function EstadoCotizacion({ estado }) {
  if (estado === 'aceptada') return <Badge variant="success" dot>Cotización aceptada</Badge>;
  if (estado === 'pendiente') return <Badge variant="warning">Sin aceptar</Badge>;
  return <Badge variant="neutral">Sin cotización</Badge>;
}

// Los anexos solo existen para Oliv y exigen una cotizacion aceptada.
function Accionable({ t }) {
  if (t.quote_status === 'aceptada' && t.quote_id && (!t.project || t.project === 'Oliv')) return <GenerarAnexosButton quoteId={t.quote_id} />;
  if (t.quote_status === 'aceptada') return <span className={lista.muted}>Anexos solo disponibles para Oliv</span>;
  return <span className={lista.muted}>Requiere cotización aceptada</span>;
}

export default function TramitesPage() {
  const [tramites, setTramites] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [proyecto, setProyecto] = useState([]);
  const [pagina, setPagina] = useState(1);

  const cargar = useCallback(async (refrescar = false) => {
    setCargando(true);
    setError(null);
    try {
      setTramites(await fetchTramites(refrescar));
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return tramites
      .filter((t) => !proyecto.length || proyecto.includes(t.project))
      .filter((t) => !q || `${t.deal_name ?? ''} ${t.unit_code ?? ''}`.toLowerCase().includes(q));
  }, [tramites, proyecto, busqueda]);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, proyecto]);

  const hayFiltros = Boolean(busqueda || proyecto.length);
  const limpiar = () => {
    setBusqueda('');
    setProyecto([]);
  };
  const desde = (pagina - 1) * PAGE_SIZE;

  if (cargando && tramites.length === 0) {
    return <div className={lista.page}><p className={lista.mensaje} role="status">Cargando trámites…</p></div>;
  }
  if (error && tramites.length === 0) {
    return (
      <div className={lista.page}>
        <div className={lista.vacio}>
          <p className={lista.error} role="alert">{error}</p>
          <Button variant="secondary" onClick={() => cargar(true)}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={lista.page}>
      <header className={lista.header}>
        <div>
          <h1 className={lista.title}>Trámites</h1>
          <p className={lista.subtitle}>Negocios en etapa 6 o posterior de su pipeline · {filtrados.length} de {tramites.length} en curso</p>
        </div>
        <div className={lista.acciones}>
          <Button variant="secondary" onClick={() => cargar(true)} disabled={cargando}>
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
            {(p) => <TextInput {...p} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Negocio o inmueble…" />}
          </Field>
        </div>
        <Field label={<span className={lista.labelConIcono}><Layers size={13} />Proyecto</span>}>
          {(p) => <MultiSelect {...p} options={PROJECTS} value={proyecto} onChange={setProyecto} placeholder="Todos los proyectos" />}
        </Field>
        {hayFiltros && (
          <button type="button" className={lista.limpiar} onClick={limpiar}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className={lista.tableWrap}>
        <table className={lista.table}>
          <thead>
            <tr>
              <th>Negocio</th>
              <th>Estado CRM</th>
              <th>Inmueble</th>
              <th>Precio total</th>
              <th>Cotización</th>
              <th>Accionables</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={6} className={lista.mensaje}>
                  {hayFiltros ? 'Sin resultados para los filtros aplicados.' : 'Sin negocios en etapa 6 o posterior por ahora.'}
                </td>
              </tr>
            ) : (
              filtrados.slice(desde, desde + PAGE_SIZE).map((t) => (
                <tr key={t.deal_id}>
                  <td>
                    <div className={lista.celdaTitulo}>
                      <span className={lista.nombre}>{t.deal_name || `Negocio ${t.deal_id}`}</span>
                      <span className={lista.detalleSec}>{t.project} · Etapa {t.etapa}</span>
                    </div>
                  </td>
                  <td><Badge variant="info">{t.estado_crm}</Badge></td>
                  <td>{t.unit_code || <span className={lista.muted}>—</span>}</td>
                  <td className={styles.precio}>{moneda(t.total_price)}</td>
                  <td><EstadoCotizacion estado={t.quote_status} /></td>
                  <td><Accionable t={t} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {filtrados.length > 0 && <Pagination page={pagina} pageSize={PAGE_SIZE} total={filtrados.length} onPageChange={setPagina} />}
      </div>

      {error && tramites.length > 0 && <p className={lista.error} role="alert">{error}</p>}
    </div>
  );
}
