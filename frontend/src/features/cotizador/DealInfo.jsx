import { Badge } from '../../components/ui/Badge.jsx';
import styles from './DealInfo.module.css';
const PORTAL_ID = import.meta.env.VITE_HUBSPOT_PORTAL_ID;
// Datos del negocio en una sola linea, de solo lectura (vienen de HubSpot). Destino y Alcobas sin valor se muestran
// "sin definir" y, si se conoce el portal de HubSpot, con el enlace para completarlos en el negocio.
export default function DealInfo({ deal, loading, descuentoPct, descuentoModo = 'porcentaje' }) {
  if (loading) {
    return <div className={styles.skeleton} role="status" aria-label="Cargando negocio" />;
  }
  if (!deal) return null;
  const faltan = !deal.destino_del_inmueble || !deal.alcobas;
  const enlace = PORTAL_ID && deal.id ? `https://app.hubspot.com/contacts/${PORTAL_ID}/record/0-3/${deal.id}` : null;
  const chips = [
    { label: 'Proyecto', value: deal.proyecto_inmobiliario_cac },
    { label: 'Destino', value: deal.destino_del_inmueble },
    { label: 'Alcobas', value: deal.alcobas },
  ];
  const tipoLabel = deal.descuento_especial ? deal.descuento_especial.charAt(0).toUpperCase() + deal.descuento_especial.slice(1) : null;
  return (
    <section className={styles.barra} aria-label="Información del negocio">
      <div className={styles.negocio}>
        <span className={styles.nombre} title={deal.dealname}>
          {deal.dealname || '---'}
        </span>
        <span className={styles.asesor}>Asesor: {deal.hubspot_owner_id || '---'}</span>
      </div>

      <ul className={styles.chips}>
        {chips.map(({ label, value }) => (
          <li key={label} className={`${styles.chip} ${value ? '' : styles.chipVacio}`}>
            {label} · {value || 'sin definir'}
          </li>
        ))}
        {tipoLabel && (
          <li>
            <Badge variant={descuentoPct ? 'info' : 'warning'}>
              {tipoLabel}
              {descuentoPct ? (descuentoModo === 'montoFijo' ? ` · COP $${descuentoPct.toLocaleString('es-CO')}` : ` · ${descuentoPct}%`) : ' · ?%'}
            </Badge>
          </li>
        )}
      </ul>

      <span className={styles.origen}>
        Datos de HubSpot · solo lectura
        {faltan && enlace && (
          <>
            {' · '}
            <a href={enlace} target="_blank" rel="noreferrer" className={styles.enlace}>
              Completar en HubSpot
            </a>
          </>
        )}
      </span>
    </section>
  );
}
