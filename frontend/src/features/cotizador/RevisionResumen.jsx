import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import styles from './RevisionResumen.module.css';
const ICONOS = {
  ok: { Icono: CircleCheck, clase: 'ok' },
  info: { Icono: Info, clase: 'info' },
  aviso: { Icono: TriangleAlert, clase: 'aviso' },
  error: { Icono: CircleAlert, clase: 'error' },
};
// Paso "Revision y generacion": resumen de la cotizacion a la izquierda; a la derecha las validaciones previas
// (las criticas bloquean el boton, las demas son avisos) y, debajo, los botones de generar que llegan como `children`.
export default function RevisionResumen({ resumen, validaciones, children }) {
  return (
    <div className={styles.root}>
      <section className={styles.tarjeta} aria-labelledby="revision-resumen">
        <h3 id="revision-resumen" className={styles.titulo}>
          Resumen de la cotización
        </h3>
        <dl className={styles.resumen}>
          {resumen.map(([etiqueta, valor]) => (
            <div key={etiqueta} className={styles.fila}>
              <dt>{etiqueta}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.tarjeta} aria-labelledby="revision-antes">
        <h3 id="revision-antes" className={styles.titulo}>
          Antes de generar
        </h3>
        <ul className={styles.validaciones}>
          {validaciones.map(({ tipo, texto }) => {
            const { Icono, clase } = ICONOS[tipo];
            return (
              <li key={texto} className={styles.validacion}>
                <span className={`${styles.icono} ${styles[clase]}`}>
                  <Icono size={14} strokeWidth={2} aria-hidden="true" />
                </span>
                <span>{texto}</span>
              </li>
            );
          })}
        </ul>
        <div className={styles.acciones}>{children}</div>
      </section>
    </div>
  );
}
