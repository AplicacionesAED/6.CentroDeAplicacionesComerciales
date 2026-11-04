import { useCurrency } from '../../context/CurrencyContext.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { unitStatusVariant } from '../../utils/cotizador.js';
import styles from './InfoCard.module.css';
export default function PropertyDisplay({ unit, towerName }) {
  const { formatPrice } = useCurrency();
  const variant = unitStatusVariant(unit.unit_status);
  const properties = [
    { label: 'Precio lista', value: formatPrice(unit.valor_unidad_comercial) },
    { label: 'Valor por m²', value: formatPrice(unit.valor_m_comercial) },
    { label: 'Área construida', value: `${unit.area_construida} m²` },
    { label: 'Área privada', value: `${unit.private_area_m2 || 0} m²` },
    { label: 'Área terraza', value: `${unit.terrace_area_m2 || 0} m²` },
    { label: 'Tipo apartamento', value: unit.tipo_de_apartamento || '---' },
    { label: 'Vista', value: unit.tipo_vista || '---' },
    { label: 'Ubicación', value: `${towerName ?? unit.torre} - Piso ${unit.piso} - ${unit.codigo_unidad}` },
  ];
  return (
    <section className={styles.card}>
      <header className={styles.head}>
        <h3 className={styles.titulo}>Información del inmueble</h3>
        {unit.unit_status && (
          <Badge variant={variant} dot={variant === 'success'}>
            {unit.unit_status}
          </Badge>
        )}
      </header>

      <dl className={styles.grid}>
        {properties.map((prop) => (
          <div key={prop.label} className={styles.dato}>
            <dt>{prop.label}</dt>
            <dd title={prop.value}>{prop.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
