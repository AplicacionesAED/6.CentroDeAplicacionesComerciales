import { useId } from 'react';
import styles from './Field.module.css';

export function Field({ label, required, error, helper, children, className = '' }) {
  const id = useId();
  const child = children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined });

  return (
    <div className={`${styles.field} ${className}`}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      {child}
      {error ? (
        <span id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </span>
      ) : helper ? (
        <span className={styles.helper}>{helper}</span>
      ) : null}
    </div>
  );
}

export function TextInput({ className = '', invalid, ...props }) {
  return <input className={`${styles.control} ${invalid ? styles.invalid : ''} ${className}`} {...props} />;
}

export function Select({ className = '', invalid, children, ...props }) {
  return (
    <select className={`${styles.control} ${invalid ? styles.invalid : ''} ${className}`} {...props}>
      {children}
    </select>
  );
}
