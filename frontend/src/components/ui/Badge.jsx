import styles from './Badge.module.css';

// `size="sm"`: version compacta para espacios chicos (celdas de la cuadricula de torre).
export function Badge({ variant = 'neutral', dot = false, size = 'md', children }) {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${size === 'sm' ? styles.sm : ''}`}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  );
}
