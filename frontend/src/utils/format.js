// Formatea un numero como pesos colombianos. Ej.: 250000000 -> "$250.000.000".
export function formatCOP(value) {
  // El ICU de Node mete un espacio de no separacion entre "$" y los digitos en es-CO: se quita
  // para dejar el formato documentado.
  const formatted = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
  return formatted.replace(/\s/g, '');
}

// Formatea un numero como dolares. Ej.: 59523 -> "$59,523".
export function formatUSD(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
