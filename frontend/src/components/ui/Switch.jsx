import styles from './Switch.module.css';
export function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`${styles.switch} ${checked ? styles.on : ''}`}
    >
      <span className={styles.perilla} />
    </button>
  );
}
