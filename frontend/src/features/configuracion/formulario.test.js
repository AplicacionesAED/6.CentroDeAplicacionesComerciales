import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aFormulario, aConfig, annualToMonthly, monthlyToAnnual, tiposDuplicados } from './formulario.js';

const config = {
  fechaEntrega: '2027-03-01',
  cuotaInicialPct: 30,
  cuotasEstandar: 36,
  minMonthlyQuota: 1500000,
  minSeparation: 5000000,
  separacionModo: 'porcentaje',
  separacionPct: 1,
  tasaMV: 1.5,
  tasaAnual: 18,
  descuentosPorTipo: { empleado: { porcentaje: 5, incluyeParqueadero: true, modo: 'porcentaje' }, vip: { porcentaje: 5000000, incluyeParqueadero: false, modo: 'montoFijo' } },
  subsidiosEnabled: true,
  subsidios: [{ id: 's1', nombre: 'Mi Casa Ya', monto: 20000000, aplicaA: 'cuotaInicial', smlvMin: 0, smlvMax: 2 }],
  smlv: 1423500,
  adicionalesEnabled: false,
  adicionales: [],
  fechasExtraordinariasEnabled: true,
};

test('formulario y config son inversos', () => {
  assert.deepEqual(aConfig(aFormulario(config)), config);
});

test('tasa anual y mensual', () => {
  assert.equal(annualToMonthly(18), 1.5);
  assert.equal(monthlyToAnnual(1.5), 18);
});

test('sin tasaAnual guardada se deriva de la mensual', () => {
  const { tasaAnual, ...sinAnual } = config;
  assert.equal(aFormulario(sinAnual).tasaAnual, '18');
});

test('un descuento numerico del formato viejo se lee como porcentaje', () => {
  const form = aFormulario({ ...config, descuentosPorTipo: { viejo: 7 } });
  assert.deepEqual(form.descuentos[0], { tipo: 'viejo', porcentaje: 7, incluyeParqueadero: false, modo: 'porcentaje' });
});

test('los descuentos sin tipo no se guardan', () => {
  const form = aFormulario(config);
  form.descuentos.push({ tipo: '  ', porcentaje: 3, incluyeParqueadero: false, modo: 'porcentaje' });
  assert.deepEqual(Object.keys(aConfig(form).descuentosPorTipo), ['empleado', 'vip']);
});

test('tipos duplicados', () => {
  const dup = tiposDuplicados([{ tipo: 'a' }, { tipo: ' a ' }, { tipo: '' }, { tipo: '' }, { tipo: 'b' }]);
  assert.deepEqual([...dup], ['a']);
});
