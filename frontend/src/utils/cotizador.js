// Constantes y ayudas del Cotizador.
export const PROJECTS = ['Oliv', 'Matimba', 'Alegra', 'Almar'];

// Color del estado de una unidad en HubSpot (unit_status): verde disponible, ambar reservado/separado, rojo vendido/bloqueado.
export function unitStatusVariant(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('disponible')) return 'success';
  if (s.includes('reservado') || s.includes('separado')) return 'warning';
  if (s.includes('vendido') || s.includes('bloqueado')) return 'danger';
  return 'neutral';
}
