// Estado del formulario de configuracion por proyecto y su conversion desde/hacia la configuracion guardada
// (AppConfig). Funciones puras: el formulario guarda los numeros como texto para poder editarlos libremente.

const round4 = (n) => Math.round(n * 10000) / 10000;

// Tasa nominal anual <-> mensual vencida: mensual = anual / 12.
export const annualToMonthly = (anual) => round4(anual / 12);
export const monthlyToAnnual = (mensual) => round4(mensual * 12);

export const nuevoId = (prefijo) => `${prefijo}_${Date.now()}_${Math.round(Math.random() * 1e6)}`;

// Un descuento guardado como numero suelto (formato viejo) se lee como porcentaje.
function descuentoAFila([tipo, v]) {
  return typeof v === 'number'
    ? { tipo, porcentaje: v, incluyeParqueadero: false, modo: 'porcentaje' }
    : { tipo, porcentaje: v.porcentaje, incluyeParqueadero: v.incluyeParqueadero, modo: v.modo || 'porcentaje' };
}

export function aFormulario(config) {
  return {
    fechaEntrega: config.fechaEntrega,
    cuotaInicialPct: config.cuotaInicialPct?.toString() || '30',
    cuotasEstandar: config.cuotasEstandar?.toString() || '36',
    minMonthlyQuota: config.minMonthlyQuota?.toString() || '1500000',
    minSeparation: config.minSeparation?.toString() || '5000000',
    separacionModo: config.separacionModo || 'porcentaje',
    separacionPct: config.separacionPct?.toString() || '1',
    tasaAnual: (config.tasaAnual != null ? config.tasaAnual : monthlyToAnnual(config.tasaMV ?? 1.5)).toString(),
    descuentos: Object.entries(config.descuentosPorTipo || {}).map(descuentoAFila),
    subsidiosEnabled: config.subsidiosEnabled ?? false,
    subsidios: config.subsidios || [],
    smlv: config.smlv?.toString() || '0',
    adicionalesEnabled: config.adicionalesEnabled ?? false,
    adicionales: config.adicionales || [],
    fechasExtraordinariasEnabled: config.fechasExtraordinariasEnabled ?? false,
  };
}

// Configuracion lista para guardar. Los descuentos sin tipo se descartan.
export function aConfig(form) {
  const descuentosPorTipo = Object.fromEntries(
    form.descuentos
      .filter((d) => d.tipo.trim() !== '')
      .map((d) => [d.tipo.trim(), { porcentaje: Number(d.porcentaje), incluyeParqueadero: d.incluyeParqueadero, modo: d.modo }])
  );
  return {
    fechaEntrega: form.fechaEntrega,
    cuotaInicialPct: Number(form.cuotaInicialPct),
    cuotasEstandar: Number(form.cuotasEstandar),
    minMonthlyQuota: Number(form.minMonthlyQuota),
    minSeparation: Number(form.minSeparation),
    separacionModo: form.separacionModo,
    separacionPct: Number(form.separacionPct),
    tasaAnual: Number(form.tasaAnual),
    tasaMV: annualToMonthly(Number(form.tasaAnual) || 0),
    descuentosPorTipo,
    subsidiosEnabled: form.subsidiosEnabled,
    subsidios: form.subsidios,
    smlv: Number(form.smlv),
    adicionalesEnabled: form.adicionalesEnabled,
    adicionales: form.adicionales,
    fechasExtraordinariasEnabled: form.fechasExtraordinariasEnabled,
  };
}

// Tipos de descuento repetidos (ignora los vacios): el tipo debe ser unico para poder guardarse como clave.
export function tiposDuplicados(descuentos) {
  const vistos = new Set();
  const repetidos = new Set();
  for (const { tipo } of descuentos) {
    const t = tipo.trim();
    if (!t) continue;
    if (vistos.has(t)) repetidos.add(t);
    vistos.add(t);
  }
  return repetidos;
}
