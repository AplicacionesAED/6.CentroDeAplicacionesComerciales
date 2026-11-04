// Ayudas puras del Seguimiento de cotizaciones.
import { formatCOP } from '../../utils/format.js';

const DIA_MS = 86400000;
const VIGENCIA_DIAS = 8; // una cotizacion pendiente vence a los 8 dias (el backend aplica la misma regla)

const aFecha = (s) => new Date(s.includes('Z') ? s : `${s}Z`);

// La torre se guarda como numero ("1") o como nombre ("Torre A"): un numero se abrevia "T1", un nombre se deja tal cual.
export const torreCorta = (torre) => (!torre ? '' : /^\d+$/.test(String(torre)) ? `T${torre}` : String(torre));

export const moneda = (v) => (v ? formatCOP(v) : '—');

// "Hoy", "Ayer", "Hace 3 dias", "Hace 2 sem."... o la fecha corta si pasa de un año.
export function fechaRelativa(s, ahora = Date.now()) {
  if (!s) return '—';
  try {
    const d = aFecha(s);
    const dias = Math.floor((ahora - d.getTime()) / DIA_MS);
    if (dias === 0) return 'Hoy';
    if (dias === 1) return 'Ayer';
    if (dias < 7) return `Hace ${dias} días`;
    if (dias < 30) return `Hace ${Math.floor(dias / 7)} sem.`;
    if (dias < 365) return `Hace ${Math.floor(dias / 30)} mes.`;
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return s;
  }
}

export function fechaCompleta(s) {
  if (!s) return '—';
  try {
    return aFecha(s).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return s;
  }
}

export function estaVencida(creadaEn, ahora = Date.now()) {
  if (!creadaEn) return false;
  return ahora - aFecha(creadaEn).getTime() > VIGENCIA_DIAS * DIA_MS;
}

// Los ultimos 6 digitos de la marca de tiempo del nombre del PDF hacen de numero de cotizacion.
export function numeroCotizacion(nombrePdf) {
  if (!nombrePdf) return '—';
  const ts = nombrePdf.replace('.pdf', '').split('_').pop() ?? '';
  return ts.slice(-6) || '—';
}

// El asesor que genero la cotizacion solo se muestra si no es el dueño del negocio (un admin cotizo por otro).
export function generadaPorOtro(q) {
  return Boolean(q.generated_by_email) && q.generated_by_email.toLowerCase() !== (q.user_email || '').toLowerCase();
}

// Una cotizacion coincide con la busqueda si lo hace su negocio, su unidad o su numero.
export function coincideBusqueda(q, texto) {
  const t = texto.trim().toLowerCase();
  if (!t) return true;
  return (q.deal_name ?? '').toLowerCase().includes(t) || (q.unit_code ?? '').toLowerCase().includes(t) || numeroCotizacion(q.pdf_filename).includes(t);
}

// Resumen por negocio calculado en el cliente a partir de las cotizaciones (cuando hay filtro de vendedor o proyecto).
export function resumirPorNegocio(cotizaciones) {
  const porNegocio = new Map();
  for (const q of cotizaciones) {
    const actual = porNegocio.get(q.deal_id);
    if (!actual) {
      porNegocio.set(q.deal_id, { deal_id: q.deal_id, deal_name: q.deal_name, quote_count: 1, last_quote_date: q.created_at, has_accepted: q.status === 'aceptada' ? 1 : 0 });
    } else {
      actual.quote_count += 1;
      if (q.created_at > actual.last_quote_date) actual.last_quote_date = q.created_at;
      if (q.status === 'aceptada') actual.has_accepted = 1;
    }
  }
  return [...porNegocio.values()];
}
