// Constantes y ayudas del Cotizador.
export const PROJECTS = ['Oliv', 'Matimba', 'Alegra', 'Almar'];

export const HUBSPOT_PORTAL_ID = '50442232';

// Id del objeto personalizado de unidades en HubSpot.
export const OBJETO_UNIDADES = import.meta.env.VITE_HUBSPOT_OBJECT_ID || '2-51798334';

// Color del estado de una unidad en HubSpot (unit_status): verde disponible, ambar reservado/separado, rojo vendido/bloqueado.
export function unitStatusVariant(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('disponible')) return 'success';
  if (s.includes('reservado') || s.includes('separado')) return 'warning';
  if (s.includes('vendido') || s.includes('bloqueado')) return 'danger';
  return 'neutral';
}
