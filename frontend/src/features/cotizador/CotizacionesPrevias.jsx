import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { fetchQuotesByDeal } from '../../api/cotizador.js';
import styles from './CotizacionesPrevias.module.css';
const VISIBLES = 4;
const cop = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : '');
// Accesorios que llevaba la cotizacion, p. ej. "P-102 · D-14".
const accesoriosDe = (q) => [q.parking_name, q.deposito_name, q.cuarto_util_name].filter(Boolean).join(' · ');
// Dos cotizaciones con el mismo inmueble, accesorios y precio dan lo mismo al recotizar: se deja la mas reciente (la lista llega de nueva a vieja).
function sinRepetidas(lista) {
  const vistas = new Set();
  return lista.filter((q) => {
    const clave = [q.unit_id, q.parking_id, q.deposito_id, q.cuarto_util_id, q.total_price].join('|');
    if (vistas.has(clave)) return false;
    vistas.add(clave);
    return true;
  });
}
// Cotizaciones que ya se hicieron para este negocio. "Recotizar" vuelve a cargar su inmueble y sus accesorios.
export default function CotizacionesPrevias({ dealId, onRecotizar, precioActual, recotizandoId }) {
  const [quotes, setQuotes] = useState([]);
  const [verTodas, setVerTodas] = useState(false);
  useEffect(() => {
    let vigente = true;
    setQuotes([]);
    setVerTodas(false);
    if (dealId) {
      fetchQuotesByDeal(dealId)
        .then((lista) => vigente && setQuotes(sinRepetidas(lista ?? [])))
        .catch((err) => console.error('Error cargando cotizaciones previas:', err));
    }
    return () => {
      vigente = false;
    };
  }, [dealId]);
  if (quotes.length === 0) return null;
  const mostradas = verTodas ? quotes : quotes.slice(0, VISIBLES);
  return (
    <section className={styles.root} aria-label="Ya cotizados para este cliente">
      <h3 className={styles.titulo}>Ya cotizados para este cliente</h3>
      <ul className={styles.lista}>
        {mostradas.map((q) => {
          const accesorios = accesoriosDe(q);
          const actual = precioActual(q);
          const anterior = Number(q.snapshot_json?.unit?.valor_unidad_comercial);
          const cambio = actual != null && anterior > 0 && Math.round(actual) !== Math.round(anterior);
          return (
            <li key={q.id} className={styles.item}>
              <div className={styles.info}>
                <span className={styles.codigo}>{q.unit_code || q.unit_id}</span>
                <span className={styles.meta}>
                  {[q.unit_tower, q.unit_floor ? `P${q.unit_floor}` : null].filter(Boolean).join(' · ')}
                </span>
                <span className={styles.detalle}>
                  {[q.total_price != null ? cop(q.total_price) : null, fecha(q.created_at), accesorios && `+ ${accesorios}`].filter(Boolean).join(' · ')}
                  {cambio && <span className={styles.cambio}> · precio actual {cop(actual)}</span>}
                </span>
              </div>
              <Button variant="secondary" onClick={() => onRecotizar(q)} disabled={recotizandoId !== null}>
                <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" />
                Recotizar
              </Button>
            </li>
          );
        })}
      </ul>
      {quotes.length > VISIBLES && (
        <button type="button" className={styles.verMas} onClick={() => setVerTodas((v) => !v)}>
          {verTodas ? 'Ver menos' : `Ver todas (${quotes.length})`}
        </button>
      )}
    </section>
  );
}
