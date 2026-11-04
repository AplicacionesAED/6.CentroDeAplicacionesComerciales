import { Check, SlidersHorizontal } from 'lucide-react';
import styles from './QuoteTypeSelector.module.css';
const OPCIONES = [
  { id: 'estandar', titulo: 'Estándar', detalle: 'Cuotas fijas según entrega' },
  { id: 'modelador', titulo: 'Modelador', detalle: 'Personalizar separación' },
];
export default function QuoteTypeSelector({ value, onChange }) {
  return (
    <section className={styles.root}>
      <h3 className={styles.titulo}>Tipo de cotización</h3>
      <div className={styles.opciones} role="radiogroup" aria-label="Tipo de cotización">
        {OPCIONES.map((op) => {
          const activa = value === op.id;
          return (
            <button
              key={op.id}
              type="button"
              role="radio"
              aria-checked={activa}
              onClick={() => onChange(op.id)}
              className={`${styles.opcion} ${activa ? styles.opcionActiva : ''}`}
            >
              <span className={styles.icono}>
                {activa ? <Check size={16} strokeWidth={2} aria-hidden="true" /> : <SlidersHorizontal size={16} strokeWidth={1.75} aria-hidden="true" />}
              </span>
              <span className={styles.texto}>
                <span className={styles.nombre}>{op.titulo}</span>
                <span className={styles.detalle}>{op.detalle}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
