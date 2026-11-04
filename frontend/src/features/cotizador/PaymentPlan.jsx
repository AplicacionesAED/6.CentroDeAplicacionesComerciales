import { Plus, X } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import styles from './PlanTable.module.css';
export default function PaymentPlan({ entries, onToggleFechaExtra, separacionFecha, onSeparacionFechaChange, separacionFechaMin, separacionFechaMax }) {
  const { formatPrice } = useCurrency();
  if (entries.length === 0) return null;
  return (
    <section className={styles.card}>
      <header className={styles.head}>
        <h3 className={styles.titulo}>Plan de pagos detallado</h3>
        <Badge variant="info">{entries.length} pagos</Badge>
      </header>

      <div className={styles.scroll}>
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th>#</th>
              <th>Concepto</th>
              <th className={styles.derecha}>Valor</th>
              <th className={styles.derecha}>Fecha estimada</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === entries.length - 1;
              const isHighlight = isFirst || isLast;
              const isExtraordinaria = !!entry.esFechaExtraordinaria;
              return (
                <tr key={entry.numero} className={isHighlight ? styles.filaDestacada : isExtraordinaria ? styles.filaInfo : ''}>
                  <td>
                    <span className={`${styles.indice} ${isFirst ? styles.indiceInicial : isLast ? styles.indiceFinal : ''}`}>{entry.numero}</span>
                  </td>
                  <td>
                    {entry.concepto}
                    {isExtraordinaria ? (
                      <button type="button" onClick={() => onToggleFechaExtra?.(entry.numero)} title="Quitar fecha extraordinaria" className={styles.chipExtra}>
                        + {entry.conceptoExtraordinario} ({formatPrice(entry.montoExtraordinario || 0)})
                        <X size={12} strokeWidth={2} aria-hidden="true" />
                      </button>
                    ) : entry.fechaExtraTipoDisponible ? (
                      <button
                        type="button"
                        onClick={() => onToggleFechaExtra?.(entry.numero)}
                        title={`Asignar ${entry.fechaExtraTipoDisponible} a esta cuota`}
                        className={styles.chipAgregar}
                      >
                        <Plus size={12} strokeWidth={2} aria-hidden="true" />
                        Agregar {entry.fechaExtraTipoDisponible}
                      </button>
                    ) : null}
                  </td>
                  <td className={`${styles.derecha} ${isFirst || isExtraordinaria ? styles.primario : isLast ? styles.advertencia : ''}`}>
                    <strong>{formatPrice(entry.valor)}</strong>
                  </td>
                  <td className={`${styles.derecha} ${styles.muted}`}>
                    {isFirst && onSeparacionFechaChange ? (
                      <input
                        type="date"
                        value={separacionFecha}
                        min={separacionFechaMin}
                        max={separacionFechaMax}
                        aria-label="Fecha de la separación"
                        onChange={(e) => onSeparacionFechaChange(e.target.value)}
                        className={styles.control}
                      />
                    ) : (
                      entry.fecha_estimada
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
