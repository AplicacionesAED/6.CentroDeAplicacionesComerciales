import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularFinanciero, generarPlanPagos, getSeparacionMinima, modelarPlan, repartirAjuste } from './planFinanciero.js';
import { formatCOP, formatUSD } from './format.js';

const config = { cuotaInicialPct: 30, separacionModo: 'porcentaje', separacionPct: 1, minSeparation: 5000000, tasaMV: 1.5, minMonthlyQuota: 1500000 };
const hoy = new Date(2026, 0, 15); // 15 de enero de 2026

test('calcularFinanciero reparte precio en separacion, cuotas y saldo', () => {
  const calc = calcularFinanciero(200000000, 10, config);
  assert.deepEqual(calc, { precio: 200000000, cuotas: 10, separacion: 2000000, montoCuotasIniciales: 58000000, valorCuotaMensual: 5800000, saldo: 140000000 });
});

test('calcularFinanciero respeta el override del % de cuota inicial', () => {
  const calc = calcularFinanciero(200000000, 10, config, 50);
  assert.equal(calc.saldo, 100000000);
  assert.equal(calc.montoCuotasIniciales, 98000000);
});

test('getSeparacionMinima: modo fijo usa minSeparation o 5 millones por defecto', () => {
  assert.equal(getSeparacionMinima(200000000, { ...config, separacionModo: 'fijo', minSeparation: 8000000 }), 8000000);
  assert.equal(getSeparacionMinima(200000000, { ...config, separacionModo: 'fijo', minSeparation: 0 }), 5000000);
});

test('calcularFinanciero con 0 cuotas no divide por cero', () => {
  assert.equal(calcularFinanciero(200000000, 0, config).valorCuotaMensual, 0);
});

test('generarPlanPagos: separacion hoy, cuotas fin de mes y saldo final', () => {
  const plan = generarPlanPagos(calcularFinanciero(200000000, 3, config), undefined, hoy);
  assert.equal(plan.length, 5);
  assert.deepEqual(plan.map((e) => e.fecha_estimada), ['2026-01-15', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31']);
  assert.equal(plan[0].concepto, 'Separación');
  assert.equal(plan[1].concepto, 'Cuota inicial 1/3');
  assert.equal(plan[4].concepto, 'Saldo final');
});

test('generarPlanPagos usa la fecha de separacion elegida y devuelve [] sin precio o cuotas', () => {
  const plan = generarPlanPagos(calcularFinanciero(200000000, 2, config), new Date(2026, 0, 20), hoy);
  assert.equal(plan[0].fecha_estimada, '2026-01-20');
  assert.deepEqual(generarPlanPagos(calcularFinanciero(0, 2, config)), []);
  assert.deepEqual(generarPlanPagos(calcularFinanciero(200000000, 0, config)), []);
});

test('repartirAjuste: reparte en partes iguales y el resto a la ultima', () => {
  assert.deepEqual(repartirAjuste([100, 100, 100], 10), [3, 3, 4]);
  assert.deepEqual(repartirAjuste([100, 100, 100], -250), [-83, -83, -84]);
});

test('repartirAjuste: un descuento nunca baja una cuota de 0', () => {
  assert.deepEqual(repartirAjuste([10, 100, 100], -150), [-10, -70, -70]);
});

test('modelarPlan: plan modelado igual al estandar no genera interes ni recargo', () => {
  const standardCalc = calcularFinanciero(200000000, 10, config);
  const r = modelarPlan({ standardCalc, modeledCalc: standardCalc, config, activeCuotas: 10, abonoActivo: false, hoy });
  assert.equal(r.financialSummary.saldoFinancieroFinal, 0);
  assert.equal(r.warning, null);
  assert.equal(r.hasChanges, false);
  assert.equal(r.modeledPlan.reduce((s, e) => s + e.valor, 0), 200000000);
});

test('modelarPlan: cuotas fijadas se respetan y las libres absorben el resto', () => {
  const standardCalc = calcularFinanciero(200000000, 10, config);
  const r = modelarPlan({ standardCalc, modeledCalc: standardCalc, config, activeCuotas: 10, abonoActivo: false, fixedQuotas: { 1: 10000000 }, hoy });
  assert.equal(r.modeledPlan[1].valor, 10000000);
  assert.equal(r.modeledPlan[1].isFixed, true);
  assert.equal(r.modeledPlan[2].valor, Math.round((58000000 - 10000000) / 9));
  assert.equal(r.hasChanges, true);
});

test('modelarPlan: avisa cuando las cuotas libres quedan bajo el minimo', () => {
  const standardCalc = calcularFinanciero(100000000, 40, config);
  const r = modelarPlan({ standardCalc, modeledCalc: standardCalc, config, activeCuotas: 40, abonoActivo: false, hoy });
  assert.match(r.warning, /por debajo del mínimo permitido/);
});

test('modelarPlan: un abono mayor al saldo avisa', () => {
  const standardCalc = calcularFinanciero(200000000, 10, config);
  const r = modelarPlan({ standardCalc, modeledCalc: standardCalc, config, activeCuotas: 10, abonoActivo: true, fixedQuotas: { 11: 999000000 }, hoy });
  assert.match(r.warning, /supera el saldo contra entrega/);
});

test('modelarPlan: el recargo por menor separacion se cobra en el saldo final', () => {
  const standardCalc = calcularFinanciero(200000000, 10, config);
  const modeledCalc = { ...standardCalc, separacion: 1000000, montoCuotasIniciales: standardCalc.montoCuotasIniciales + 1000000 };
  const r = modelarPlan({ standardCalc, modeledCalc, config, activeCuotas: 10, abonoActivo: false, hoy });
  const saldo = r.modeledPlan.at(-1);
  assert.equal(saldo.valor, modeledCalc.saldo + r.financialSummary.saldoFinancieroFinal);
  assert.equal(r.financialSummary.capitalPrestadoInicial, 1000000);
});

test('modelarPlan: sin saldo contraentrega el ajuste se reparte en las cuotas', () => {
  const standardCalc = calcularFinanciero(200000000, 10, config);
  const modeledCalc = { ...standardCalc, saldo: 0, montoCuotasIniciales: 198000000 };
  const r = modelarPlan({ standardCalc, modeledCalc, config, activeCuotas: 10, abonoActivo: false, recargoOverride: 100, hoy });
  assert.equal(r.modeledPlan.at(-1).valor, 0);
  assert.equal(r.ajusteEnCuotas, 100);
});

test('modelarPlan: ignorarRecargo deja el plan plano', () => {
  const standardCalc = calcularFinanciero(200000000, 10, config);
  const modeledCalc = { ...standardCalc, separacion: 1000000, montoCuotasIniciales: standardCalc.montoCuotasIniciales + 1000000 };
  const r = modelarPlan({ standardCalc, modeledCalc, config, activeCuotas: 10, abonoActivo: false, ignorarRecargo: true, hoy });
  assert.equal(r.financialSummary.saldoFinancieroFinal, 0);
  assert.equal(r.modeledPlan.at(-1).valor, modeledCalc.saldo);
});

test('formatCOP y formatUSD', () => {
  assert.equal(formatCOP(250000000), '$250.000.000');
  assert.equal(formatUSD(59523), '$59,523');
});

test('modelarPlan: lo que una cuota paga por encima de su parte de la cuota inicial se abona al saldo', () => {
  const standardCalc = calcularFinanciero(200000000, 10, config);
  // Cuota base 5.8M; la ultima paga 50M de mas.
  const r = modelarPlan({ standardCalc, modeledCalc: standardCalc, config, activeCuotas: 10, abonoActivo: true, fixedQuotas: { 10: 55800000 }, hoy });
  assert.equal(r.warning, null);
  assert.equal(r.abonoTotal, 50000000);
  const ultima = r.modeledPlan[10];
  assert.equal(ultima.valor, 55800000);
  assert.equal(ultima.abonoParte, 50000000);
  assert.equal(r.modeledPlan[1].valor, 5800000); // las demas cuotas no bajan
  const saldoFinal = r.modeledPlan[r.modeledPlan.length - 1];
  assert.equal(saldoFinal.valor, 140000000 - 50000000); // la resta llega al saldo final
  assert.equal(r.financialSummary.saldoFinancieroFinal, 0); // el abono no genera interes
  assert.equal(r.modeledPlan.reduce((s, e) => s + e.valor, 0), 200000000);
});

test('modelarPlan: sin el check, pasarse de la cuota inicial avisa y dice que active el abono', () => {
  const standardCalc = calcularFinanciero(200000000, 10, config);
  const fixedQuotas = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, 7000000]));
  const r = modelarPlan({ standardCalc, modeledCalc: standardCalc, config, activeCuotas: 10, abonoActivo: false, fixedQuotas, hoy });
  assert.match(r.warning, /superan la cuota inicial/);
  assert.match(r.warning, /Abonar adicionalmente al saldo/);
  const conCheck = modelarPlan({ standardCalc, modeledCalc: standardCalc, config, activeCuotas: 10, abonoActivo: true, fixedQuotas, hoy });
  assert.equal(conCheck.warning, null);
  assert.equal(conCheck.abonoTotal, 12000000); // 10 cuotas de 7M contra una base de 5.8M
  assert.equal(conCheck.modeledPlan[conCheck.modeledPlan.length - 1].valor, 140000000 - 12000000);
});

test('modelarPlan: un abono dentro de una cuota no mueve a las cuotas libres', () => {
  const standardCalc = calcularFinanciero(200000000, 10, config);
  const r = modelarPlan({ standardCalc, modeledCalc: standardCalc, config, activeCuotas: 10, abonoActivo: true, fixedQuotas: { 3: 8800000, 10: 20000000 }, hoy });
  assert.equal(r.abonoTotal, 3000000 + 14200000);
  assert.equal(r.modeledPlan[1].valor, 5800000);
});

test('modelarPlan: una cuota por encima de su parte sin el check bloquea y dice que active el abono', () => {
  const standardCalc = calcularFinanciero(200000000, 10, config);
  const r = modelarPlan({ standardCalc, modeledCalc: standardCalc, config, activeCuotas: 10, abonoActivo: false, fixedQuotas: { 10: 15800000 }, hoy });
  assert.match(r.warning, /Abonar adicionalmente al saldo/);
  const conCheck = modelarPlan({ standardCalc, modeledCalc: standardCalc, config, activeCuotas: 10, abonoActivo: true, fixedQuotas: { 10: 15800000 }, hoy });
  assert.equal(conCheck.warning, null);
  assert.equal(conCheck.abonoTotal, 10000000);
  const sinExceso = modelarPlan({ standardCalc, modeledCalc: standardCalc, config, activeCuotas: 10, abonoActivo: false, fixedQuotas: { 10: 3000000 }, hoy });
  assert.equal(sinExceso.warning, null);
});

test('modelarPlan: con todas las cuotas fijadas el redondeo no da un aviso de $0', () => {
  const standardCalc = calcularFinanciero(509730484, 36, config);
  const todas = (valor) => Object.fromEntries(Array.from({ length: 36 }, (_, i) => [i + 1, valor]));
  // Con abono, todas por encima de su parte: el excedente es abono y la cuota inicial queda exacta.
  const conAbono = modelarPlan({ standardCalc, modeledCalc: standardCalc, config, activeCuotas: 36, abonoActivo: true, fixedQuotas: todas(5000000), hoy });
  assert.equal(conAbono.warning, null);
  assert.equal(conAbono.abonoTotal, 36 * 5000000 - Math.round(standardCalc.montoCuotasIniciales));
  // Sin abono, todas en su valor redondeado: solo difiere por pesos de redondeo.
  const redondeado = Math.round(standardCalc.montoCuotasIniciales / 36);
  const sinAbono = modelarPlan({ standardCalc, modeledCalc: standardCalc, config, activeCuotas: 36, abonoActivo: false, fixedQuotas: todas(redondeado), hoy });
  assert.equal(sinAbono.warning, null);
});

test('modelarPlan: el aviso de cuotas fijas que superan la cuota inicial dice el monto real', () => {
  const standardCalc = calcularFinanciero(200000000, 10, config);
  const fixedQuotas = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, 7000000]));
  const r = modelarPlan({ standardCalc, modeledCalc: standardCalc, config, activeCuotas: 10, abonoActivo: false, fixedQuotas, hoy });
  assert.doesNotMatch(r.warning, /por \$\s?0(\D|$)/);
  assert.match(r.warning, /12\.000\.000/);
});
