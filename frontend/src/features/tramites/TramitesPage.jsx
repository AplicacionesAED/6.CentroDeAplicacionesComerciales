// Negocios en etapa 6 o posterior de su pipeline (en tramite). Es el unico lugar donde se generan los anexos
// de una cotizacion aceptada.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { PROJECTS } from '../../utils/cotizador.js';
import { fetchTramites } from '../../api/cotizador.js';
import { moneda } from '../seguimiento/cotizaciones.js';
import GenerarAnexosButton from '../seguimiento/GenerarAnexosButton.jsx';
import styles from './Tramites.module.css';

function EstadoCotizacion({ estado }) {
  if (estado === 'aceptada') return <Badge variant="success" dot>Cotización aceptada</Badge>;
  if (estado === 'pendiente') return <Badge variant="warning">Sin aceptar</Badge>;
  return <Badge variant="neutral">Sin cotización</Badge>;
}

// Los anexos solo existen para Oliv y exigen una cotizacion aceptada.
function Accionable({ t }) {
  if (t.quote_status === 'aceptada' && t.quote_id && (!t.project || t.project === 'Oliv')) return <GenerarAnexosButton quoteId={t.quote_id} />;
  if (t.quote_status === 'aceptada') return <span className={styles.muted}>Anexos solo disponibles para Oliv</span>;
  return <span className={styles.muted}>Requiere cotización aceptada</span>;
}

export default function TramitesPage() {
  const [tramites, setTramites] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [proyecto, setProyecto] = useState('');

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

  const filtrados = useMemo(() => (proyecto ? tramites.filter((t) => t.project === proyecto) : tramites), [tramites, proyecto]);

  const pestanas = useMemo(() => {
    const conteo = {};
    for (const t of tramites) conteo[t.project] = (conteo[t.project] || 0) + 1;
    return [{ key: '', label: 'Todos', badge: tramites.length }, ...PROJECTS.map((p) => ({ key: p, label: p, badge: conteo[p] || 0 }))];
  }, [tramites]);

  if (cargando && tramites.length === 0) {
    return <div className={styles.page}><p className={styles.estado} role="status">Cargando trámites…</p></div>;
  }
  if (error && tramites.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.estado}>
          <p className={styles.error} role="alert">{error}</p>
          <Button variant="secondary" onClick={() => cargar(true)}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Trámites</h1>
          <p className={styles.subtitle}>Negocios en etapa 6 o posterior de su pipeline: {filtrados.length} de {tramites.length} en curso.</p>
        </div>
        <Button variant="secondary" onClick={() => cargar(true)} disabled={cargando}>
          <RefreshCw size={16} strokeWidth={1.75} className={cargando ? styles.girar : undefined} aria-hidden="true" />
          Refrescar
        </Button>
      </header>

      <Tabs tabs={pestanas} value={proyecto} onChange={setProyecto} ariaLabel="Filtrar por proyecto" />

      <div className={styles.tablaCard}>
        <div className={styles.tablaWrap}>
          <table className={styles.tabla}>
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
                  <td colSpan={6} className={styles.estado}>
                    {proyecto ? `Sin negocios de ${proyecto} en etapa 6 o posterior.` : 'Sin negocios en etapa 6 o posterior por ahora.'}
                  </td>
                </tr>
              ) : (
                filtrados.map((t) => (
                  <tr key={t.deal_id}>
                    <td>
                      <div className={styles.dosLineas}>
                        <strong>{t.deal_name || `Negocio ${t.deal_id}`}</strong>
                        <span className={styles.muted}>{t.project} · Etapa {t.etapa}</span>
                      </div>
                    </td>
                    <td><Badge variant="info">{t.estado_crm}</Badge></td>
                    <td>{t.unit_code || '—'}</td>
                    <td className={styles.precio}>{moneda(t.total_price)}</td>
                    <td><EstadoCotizacion estado={t.quote_status} /></td>
                    <td><Accionable t={t} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {error && tramites.length > 0 && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
