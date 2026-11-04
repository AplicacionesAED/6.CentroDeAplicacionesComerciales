// Marcador de un modulo todavia no migrado desde la app vieja.
export function PendientePage({ titulo }) {
  return (
    <div style={{ padding: 'var(--space-lg)' }}>
      <h1 style={{ fontSize: 'var(--text-headline-size)', fontWeight: 'var(--text-headline-weight)' }}>{titulo}</h1>
      <p style={{ color: 'var(--color-ink-muted)' }}>Módulo pendiente de migración.</p>
    </div>
  );
}
