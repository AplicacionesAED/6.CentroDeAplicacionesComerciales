// Barra de pestañas para detalles con varias secciones (migración de diseño
// 2026-10-05). Controlada: el padre guarda cuál está activa y decide qué
// renderiza -- así el contenido de una pestaña (ej. Conciliación o Movimientos,
// que cargan datos al montarse) solo se monta cuando se abre.
import styles from './Tabs.module.css';

export function Tabs({ tabs, value, onChange, ariaLabel = 'Secciones' }) {
  return (
    <div className={styles.tabs} role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const activa = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activa}
            className={`${styles.tab} ${activa ? styles.tabActiva : ''}`}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
            {tab.badge != null && tab.badge !== 0 && <span className={styles.badge}>{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
