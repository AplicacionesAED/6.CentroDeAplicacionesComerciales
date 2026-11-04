import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fechaRelativa, estaVencida, numeroCotizacion, generadaPorOtro, coincideBusqueda, resumirPorNegocio, moneda, torreCorta } from './cotizaciones.js';

const ahora = Date.parse('2026-11-04T12:00:00Z');
const hace = (dias) => new Date(ahora - dias * 86400000).toISOString();

test('fechaRelativa', () => {
  assert.equal(fechaRelativa(hace(0), ahora), 'Hoy');
  assert.equal(fechaRelativa(hace(1), ahora), 'Ayer');
  assert.equal(fechaRelativa(hace(3), ahora), 'Hace 3 días');
  assert.equal(fechaRelativa(hace(15), ahora), 'Hace 2 sem.');
  assert.equal(fechaRelativa(hace(90), ahora), 'Hace 3 mes.');
  assert.equal(fechaRelativa('', ahora), '—');
});

test('una fecha sin zona se toma como UTC', () => {
  assert.equal(fechaRelativa('2026-11-04 11:00:00', ahora), 'Hoy');
});

test('vence a los 8 dias', () => {
  assert.equal(estaVencida(hace(7), ahora), false);
  assert.equal(estaVencida(hace(9), ahora), true);
  assert.equal(estaVencida('', ahora), false);
});

test('numero de cotizacion desde el nombre del PDF', () => {
  assert.equal(numeroCotizacion('cotizacion_1001_1793812553149.pdf'), '553149');
  assert.equal(numeroCotizacion(null), '—');
});

test('generadaPorOtro solo si difiere del dueño', () => {
  assert.equal(generadaPorOtro({ generated_by_email: 'A@x.com', user_email: 'a@x.com' }), false);
  assert.equal(generadaPorOtro({ generated_by_email: 'admin@x.com', user_email: 'a@x.com' }), true);
  assert.equal(generadaPorOtro({ user_email: 'a@x.com' }), false);
});

test('busqueda por negocio, unidad o numero', () => {
  const q = { deal_name: 'Negocio Uno', unit_code: 'A-101', pdf_filename: 'c_1_1793812553149.pdf' };
  assert.equal(coincideBusqueda(q, 'uno'), true);
  assert.equal(coincideBusqueda(q, 'a-101'), true);
  assert.equal(coincideBusqueda(q, '553149'), true);
  assert.equal(coincideBusqueda(q, 'zzz'), false);
  assert.equal(coincideBusqueda(q, '  '), true);
});

test('resumen por negocio', () => {
  const r = resumirPorNegocio([
    { deal_id: '1', deal_name: 'A', created_at: '2026-01-01T00:00:00Z', status: 'pendiente' },
    { deal_id: '1', deal_name: 'A', created_at: '2026-02-01T00:00:00Z', status: 'aceptada' },
    { deal_id: '2', deal_name: 'B', created_at: '2026-01-05T00:00:00Z', status: 'pendiente' },
  ]);
  assert.deepEqual(r.find((d) => d.deal_id === '1'), { deal_id: '1', deal_name: 'A', quote_count: 2, last_quote_date: '2026-02-01T00:00:00Z', has_accepted: 1 });
  assert.equal(r.find((d) => d.deal_id === '2').has_accepted, 0);
});

test('moneda', () => {
  assert.equal(moneda(0), '—');
  assert.equal(moneda(1500000), '$1.500.000');
});

test('torreCorta abrevia numeros y respeta nombres', () => {
  assert.equal(torreCorta('2'), 'T2');
  assert.equal(torreCorta('Torre A'), 'Torre A');
  assert.equal(torreCorta(''), '');
});
