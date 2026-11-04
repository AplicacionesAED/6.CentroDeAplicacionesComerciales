import { Badge } from '../../components/ui/Badge.jsx';
import styles from './InfoCard.module.css';
export default function DealInfo({ deal, loading, descuentoPct, descuentoModo = 'porcentaje' }) {
  if (loading) {
    return <div className={styles.skeleton} role="status" aria-label="Cargando negocio" />;
  }
  if (!deal) return null;
  const items = [
    { label: 'Negocio', value: deal.dealname },
    { label: 'Asesor comercial', value: deal.hubspot_owner_id },
    { label: 'Contacto', value: deal.nombre_contacto_ },
    { label: 'Proyecto', value: deal.proyecto_inmobiliario_cac },
    { label: 'Destino', value: deal.destino_del_inmueble },
    { label: 'Alcobas', value: deal.alcobas },
  ];
  const tipoLabel = deal.descuento_especial ? deal.descuento_especial.charAt(0).toUpperCase() + deal.descuento_especial.slice(1) : null;
  return (
    <section className={styles.card}>
      <header className={styles.head}>
        <h3 className={styles.titulo}>Información del negocio</h3>
        {tipoLabel && (
          <Badge variant={descuentoPct ? 'info' : 'warning'}>
            {tipoLabel}
            {descuentoPct ? (descuentoModo === 'montoFijo' ? ` · COP $${descuentoPct.toLocaleString('es-CO')}` : ` · ${descuentoPct}%`) : ' · ?%'}
          </Badge>
        )}
      </header>

      <dl className={styles.grid}>
        {items.map((item) => (
          <div key={item.label} className={styles.dato}>
            <dt>{item.label}</dt>
            <dd title={item.value}>{item.value || '---'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
