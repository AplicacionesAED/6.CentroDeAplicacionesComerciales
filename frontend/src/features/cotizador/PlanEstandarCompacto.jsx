import { useState } from 'react';
import { useCurrency } from '../../context/CurrencyContext.jsx';
import { Button } from '../../components/ui/Button.jsx';
import PaymentPlan from './PaymentPlan.jsx';
import styles from './PlanEstandarCompacto.module.css';
// Plan estandar en una sola linea ("36 cuotas de $X · del ... al ..."); el cronograma completo se abre solo si se pide.
export default function PlanEstandarCompacto({ entries, cuotas, valorCuota, onPersonalizar, onToggleFechaExtra }) {
  const { formatPrice } = useCurrency();
  const [completo, setCompleto] = useState(false);
  const cuotasIniciales = entries.filter((e) => e.numero >= 1 && e !== entries[entries.length - 1]);
  const primera = cuotasIniciales[0]?.fecha_estimada;
  const ultima = cuotasIniciales[cuotasIniciales.length - 1]?.fecha_estimada;
  return (
    <div className={styles.root}>
      <section className={styles.resumen}>
        <div className={styles.texto}>
          <strong>
            {cuotas} cuotas de {formatPrice(valorCuota)}
          </strong>
          <span className={styles.detalle}>{primera && ultima ? `Del ${primera} al ${ultima} · más el saldo contra entrega` : 'Más el saldo contra entrega'}</span>
        </div>
        <div className={styles.acciones}>
          <Button variant="secondary" onClick={() => setCompleto((v) => !v)} aria-expanded={completo}>
            {completo ? 'Ocultar cronograma' : 'Ver cronograma completo'}
          </Button>
          <Button onClick={onPersonalizar}>Personalizar en Modelador</Button>
        </div>
      </section>

      {completo && <PaymentPlan entries={entries} onToggleFechaExtra={onToggleFechaExtra} />}
    </div>
  );
}
