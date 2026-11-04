// Calculos financieros del Cotizador, como funciones puras (sin React ni contexto). Portado de
// useFinancialCalc, usePaymentPlan y useModeledPlan de la app vieja sin cambiar la logica: los
// hooks de hooks/ solo envuelven estas funciones en useMemo/useState.
//
// `config` es la configuracion del proyecto (AppConfig): cuotaInicialPct, separacionModo
// ('porcentaje' | 'fijo'), separacionPct, minSeparation, tasaMV, minMonthlyQuota.
import { addMonths, endOfMonth, format } from 'date-fns';

// Ultimo dia del mes que queda `mesesAdelante` meses calendario despues de `desde`.
export function nthPaymentDate(desde, mesesAdelante) {
  return endOfMonth(addMonths(desde, mesesAdelante));
}

export function getSeparacionMinima(precio, config) {
  const modo = config.separacionModo ?? 'porcentaje';
  if (modo === 'fijo') return config.minSeparation || 5000000;
  const pct = config.separacionPct ?? 1;
  return Math.round(precio * (pct / 100));
}

/**
 * Distribucion de un precio:
 *  - Cuota inicial total: cuotaInicialPct% del precio (por proyecto, ej. 30% Oliv, 50% Almar)
 *  - Separacion: minimo configurable (porcentaje del precio o monto fijo)
 *  - Cuotas iniciales: cuota inicial - separacion
 *  - Saldo final: (100 - cuotaInicialPct)% del precio
 *
 * `cuotaInicialPctOverride` ajusta el % solo para ESTA cotizacion (null/undefined usa el del proyecto).
 */
export function calcularFinanciero(precio, cuotas, config, cuotaInicialPctOverride) {
  const cuotaInicialPct = (cuotaInicialPctOverride ?? config.cuotaInicialPct ?? 30) / 100;
  const cuotaInicialTotal = precio * cuotaInicialPct;
  const separacion = getSeparacionMinima(precio, config);
  const montoCuotasIniciales = cuotaInicialTotal - separacion;
  const valorCuotaMensual = cuotas > 0 ? Math.round(montoCuotasIniciales / cuotas) : 0;
  const saldo = precio * (1 - cuotaInicialPct);

  return {
    precio,
    cuotas,
    separacion: Math.round(separacion),
    montoCuotasIniciales: Math.round(montoCuotasIniciales),
    valorCuotaMensual,
    saldo: Math.round(saldo),
  };
}

/**
 * Plan de pagos: entrada 0 = Separacion (hoy, o `separacionDate`), 1..n = cuotas iniciales (ultimo
 * dia de cada mes calendario) y n+1 = Saldo final. `hoy` solo se pasa en pruebas.
 */
export function generarPlanPagos(calc, separacionDate, hoy = new Date()) {
  if (calc.precio <= 0 || calc.cuotas <= 0) return [];

  const entries = [];
  entries.push({
    numero: 0,
    concepto: 'Separación',
    valor: calc.separacion,
    fecha_estimada: format(separacionDate ?? hoy, 'yyyy-MM-dd'),
  });

  for (let i = 1; i <= calc.cuotas; i++) {
    entries.push({
      numero: i,
      concepto: `Cuota inicial ${i}/${calc.cuotas}`,
      valor: calc.valorCuotaMensual,
      fecha_estimada: format(nthPaymentDate(hoy, i), 'yyyy-MM-dd'),
    });
  }

  entries.push({
    numero: calc.cuotas + 1,
    concepto: 'Saldo final',
    valor: calc.saldo,
    fecha_estimada: format(nthPaymentDate(hoy, calc.cuotas + 1), 'yyyy-MM-dd'),
  });

  return entries;
}

/**
 * Reparte `ajuste` (+recargo / -descuento, en pesos enteros) en partes iguales entre las cuotas
 * dadas; el resto de la division va a la ultima. Un descuento nunca baja una cuota de $0: lo que
 * no le cabe a una cuota se reparte entre las demas. Devuelve el delta de cada una.
 */
export function repartirAjuste(valores, ajuste) {
  const deltas = valores.map(() => 0);
  let restante = ajuste;
  let activos = valores.map((_, i) => i);
  while (restante !== 0 && activos.length > 0) {
    const n = activos.length;
    const base = Math.trunc(restante / n);
    const resto = restante - base * n;
    const siguientes = [];
    let aplicado = 0;
    activos.forEach((i, k) => {
      let d = base + (k === n - 1 ? resto : 0);
      const minimo = -(valores[i] + deltas[i]);
      if (d < minimo) d = minimo;
      else siguientes.push(i);
      deltas[i] += d;
      aplicado += d;
    });
    restante -= aplicado;
    if (aplicado === 0 || siguientes.length === activos.length) break;
    activos = siguientes;
  }
  return deltas;
}

const fmtCOP = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

/**
 * Plan modelado: reparte la cuota inicial en `activeCuotas` cuotas (las fijadas por el asesor en
 * `fixedQuotas`, { numero: valor }, no se tocan), calcula el interes frente al plan estandar y lo
 * cobra como recargo/descuento en el saldo contraentrega (o en las cuotas si no hay saldo).
 *
 * @param {object} p
 * @param {object} p.standardCalc plan estandar (calcularFinanciero)
 * @param {object} p.modeledCalc plan modelado (calcularFinanciero)
 * @param {object} p.config configuracion del proyecto
 * @param {number} p.activeCuotas cuantas cuotas reciben el reparto de la cuota inicial
 * @param {boolean} p.abonoActivo si las cuotas > activeCuotas se toman como abono al saldo
 * @param {Date} [p.separacionDate] fecha elegida para la Separacion (default: hoy)
 * @param {Object<number, number>} [p.fixedQuotas]
 * @param {number|null} [p.recargoOverride] ajuste manual (admin) del recargo/descuento
 * @param {boolean} [p.ignorarRecargo] admin: plan plano, sin intereses ni diferencia acumulada
 * @param {Date} [p.hoy] solo para pruebas
 */
export function modelarPlan({
  standardCalc,
  modeledCalc,
  config,
  activeCuotas,
  abonoActivo,
  separacionDate,
  fixedQuotas = {},
  recargoOverride,
  ignorarRecargo,
  hoy = new Date(),
}) {
  const horizon = Math.max(standardCalc.cuotas, activeCuotas); // se extiende si admin supera el estandar
  const standardPlan = generarPlanPagos(standardCalc, separacionDate, hoy);
  const baseModeledPlan = generarPlanPagos({ ...modeledCalc, cuotas: horizon }, separacionDate, hoy);

  const claves = Object.keys(fixedQuotas);
  const maxAvailable = modeledCalc.montoCuotasIniciales;
  // Cuotas fijadas que cuentan a la cuota inicial: si hay abono, solo las de 1..N.
  const fixed30Sum = claves.filter((k) => !abonoActivo || Number(k) <= activeCuotas).reduce((s, k) => s + fixedQuotas[Number(k)], 0);
  // Abono: cuotas fijadas en meses > N (solo cuando el abono esta activo).
  const abonoTotal = abonoActivo ? claves.filter((k) => Number(k) > activeCuotas).reduce((s, k) => s + fixedQuotas[Number(k)], 0) : 0;
  const fixedActiveCount = claves.filter((k) => Number(k) <= activeCuotas).length;
  const cuotasLibresActivas = Math.max(0, activeCuotas - fixedActiveCount);
  const saldoRestante = Math.max(0, maxAvailable - fixed30Sum);
  const freeCuotaValue = cuotasLibresActivas > 0 ? Math.round(saldoRestante / cuotasLibresActivas) : 0;

  let modeledPlan = [];
  let sumIntereses = 0;
  let ajusteEnCuotas = 0;

  if (baseModeledPlan.length) {
    const plan = [];
    let ajusteEfectivo = 0;
    let runningDiferenciaAcumulada = 0;
    const r = config.tasaMV / 100;

    for (const baseEntry of baseModeledPlan) {
      if (baseEntry.numero === 0) {
        // Separacion
        const standardSeparacion = standardPlan.find((s) => s.numero === 0)?.valor || 0;
        runningDiferenciaAcumulada = standardSeparacion - baseEntry.valor;
        plan.push({ ...baseEntry, isFixed: true, interesGenerado: 0, diferenciaAcumulada: runningDiferenciaAcumulada });
      } else if (baseEntry.numero > 0 && baseEntry.numero <= horizon) {
        const isFixed = fixedQuotas[baseEntry.numero] !== undefined;
        const isAbono = abonoActivo && baseEntry.numero > activeCuotas && isFixed;

        if (isAbono) {
          // Abono al saldo: muestra su valor, pero NO entra en interes ni en la diferencia.
          plan.push({
            ...baseEntry,
            valor: fixedQuotas[baseEntry.numero],
            isFixed: true,
            isAbono: true,
            interesGenerado: 0,
            diferenciaAcumulada: runningDiferenciaAcumulada,
          });
          continue;
        }

        const valor = isFixed ? fixedQuotas[baseEntry.numero] : baseEntry.numero <= activeCuotas ? freeCuotaValue : 0;
        // Mas alla de standardCalc.cuotas el plan estandar ya no tiene cuota ese mes (solo le queda
        // el saldo final, que se compara aparte): sin este limite el saldo final del estandar se
        // colaba aqui como una cuota normal cuando el horizonte modelado supera las cuotas estandar.
        const standardValue = baseEntry.numero <= standardCalc.cuotas ? standardPlan.find((s) => s.numero === baseEntry.numero)?.valor || 0 : 0;
        runningDiferenciaAcumulada += standardValue - valor;
        // ignorarRecargo: el plan queda plano, sin interes que acumular.
        const interesGenerado = ignorarRecargo ? 0 : runningDiferenciaAcumulada * r;
        sumIntereses += interesGenerado;
        plan.push({ ...baseEntry, valor, isFixed, interesGenerado, diferenciaAcumulada: runningDiferenciaAcumulada });
      } else {
        // Saldo Final: interes con el saldo original; el valor mostrado se reduce por el abono.
        const standardValue = standardPlan.find((s) => s.numero > standardCalc.cuotas)?.valor || standardPlan[standardPlan.length - 1]?.valor || 0;
        runningDiferenciaAcumulada += standardValue - modeledCalc.saldo;
        const interesGenerado = ignorarRecargo ? 0 : runningDiferenciaAcumulada * r;
        sumIntereses += interesGenerado;
        // El recargo/descuento financiero SIEMPRE se cobra en el saldo contraentrega (indicacion
        // del negocio, oct 2026, todos los proyectos): las cuotas quedan limpias y esta fila lleva
        // saldo +/- ajuste. El ajuste efectivo es el manual del admin (`recargoOverride`) si lo
        // puso, y 0 si activo "ignorar". `sumIntereses` real se reporta en `financialSummary`.
        ajusteEfectivo = ignorarRecargo ? 0 : recargoOverride ?? Math.round(sumIntereses);
        plan.push({
          ...baseEntry,
          valor: modeledCalc.saldo > 0 ? Math.max(0, modeledCalc.saldo - abonoTotal + ajusteEfectivo) : 0,
          isFixed: false,
          interesGenerado,
          diferenciaAcumulada: runningDiferenciaAcumulada,
        });
      }
    }

    // Sin saldo contraentrega (modo "100% en cuotas", o un subsidio lo cubrio por completo) el
    // ajuste no tiene donde cobrarse en el Saldo Final: se reparte en las cuotas. Va primero a las
    // libres (las fijadas por el asesor no se tocan); si todas estan fijadas, a la ultima cuota con
    // valor, para que la suma del plan siga dando precio +/- ajuste. Una cuota nunca baja de $0.
    if (modeledCalc.saldo <= 0 && ajusteEfectivo !== 0) {
      const esCuotaConValor = (e) => e.numero >= 1 && e.numero <= activeCuotas && !e.isAbono && e.valor > 0;
      const candidatas = plan.filter(esCuotaConValor);
      const libres = candidatas.filter((e) => !e.isFixed);
      const objetivo = libres.length > 0 ? libres : candidatas.slice(-1);
      if (objetivo.length > 0) {
        const deltas = repartirAjuste(
          objetivo.map((e) => e.valor),
          ajusteEfectivo
        );
        const tipo = ajusteEfectivo > 0 ? 'Recargo' : 'Descuento';
        objetivo.forEach((entry, k) => {
          if (deltas[k] === 0) return;
          const idx = plan.indexOf(entry);
          plan[idx] = { ...entry, valor: entry.valor + deltas[k], ajusteAlmar: { tipo, monto: deltas[k] } };
        });
        ajusteEnCuotas = deltas.reduce((s, d) => s + d, 0);
      }
    }
    modeledPlan = plan;
  }

  let warning = null;
  const abonoTotalW = abonoTotal;
  if (abonoTotalW > modeledCalc.saldo) {
    warning = `El abono (${fmtCOP(abonoTotalW)}) supera el saldo contra entrega disponible (${fmtCOP(modeledCalc.saldo)}).`;
  } else if (cuotasLibresActivas > 0) {
    if (freeCuotaValue < config.minMonthlyQuota) {
      warning = `El valor de las cuotas libres (${fmtCOP(freeCuotaValue)}) está por debajo del mínimo permitido (${fmtCOP(config.minMonthlyQuota)}).`;
    }
  } else if (saldoRestante > 0) {
    warning = `La suma de las cuotas fijas no cubre el total requerido de cuota inicial. Faltan ${fmtCOP(saldoRestante)}`;
  } else if (maxAvailable - fixed30Sum < 0) {
    warning = `La suma de las cuotas fijas supera el total de la cuota inicial por ${fmtCOP(Math.abs(saldoRestante))}`;
  }

  const financialSummary =
    !standardPlan.length || !modeledPlan.length
      ? { capitalPrestadoInicial: 0, saldoFinancieroFinal: 0, tasaAplicada: config.tasaMV }
      : {
          capitalPrestadoInicial: (standardPlan[0]?.valor || 0) - (modeledPlan[0]?.valor || 0),
          saldoFinancieroFinal: Math.round(sumIntereses),
          tasaAplicada: config.tasaMV,
        };

  return {
    modeledPlan,
    warning,
    financialSummary,
    hasChanges: claves.length > 0,
    abonoTotal,
    // Parte del recargo/descuento cobrada dentro de las cuotas (solo sin saldo contraentrega).
    // Quien reparta las cuotas por su cuenta debe sumarla al total a repartir.
    ajusteEnCuotas,
  };
}
