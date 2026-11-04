// Cotización aceptada de un negocio, ya armada para otras aplicaciones (Cartera): el contrato de la respuesta vive
// aquí, así quien consume no depende de las columnas de `cotizaciones` ni de la forma interna del snapshot.
// `informacionFinanciera` repite el desglose de "Información financiera" de QuoteDetailPage (seguimiento).
const { Op } = require('sequelize');
const Cotizacion = require('./cotizacion.model');

const numero = (v) => (v == null || Number.isNaN(Number(v)) ? null : Number(v));
const subInmueble = (id, nombre) => (!id && !nombre ? null : { id: id ?? null, nombre: nombre ?? null });

function leerSnapshot(valor) {
  if (!valor) return null;
  if (typeof valor !== 'string') return valor;
  try {
    return JSON.parse(valor);
  } catch {
    return null;
  }
}

// null si la cotización es vieja y no tiene snapshot: no hay desglose que mostrar.
function informacionFinanciera(snap) {
  if (!snap?.calc) return null;
  const { unit, calc, parking, deposito, cuartoUtil } = snap;
  const monto = numero(snap.descuentoMonto);
  return {
    valorApartamento: numero(unit?.valor_unidad_comercial),
    descuento: monto > 0 ? { tipo: snap.descuentoTipo ?? null, modo: snap.descuentoModo ?? null, porcentaje: numero(snap.descuentoPct), monto } : null,
    valorParqueadero: parking ? numero(parking.price) : null,
    valorDeposito: deposito ? numero(deposito.price) : null,
    valorCuartoUtil: cuartoUtil ? numero(cuartoUtil.price) : null,
    bonoAplicado: numero(snap.bonoAplicado) > 0 ? numero(snap.bonoAplicado) : null,
    adicionales: (snap.adicionalesAplicados ?? []).map((a) => ({ nombre: a.nombre ?? null, monto: numero(a.monto) })),
    valorTotal: numero(calc.precio),
  };
}

function mapear(cotizacion) {
  const snap = leerSnapshot(cotizacion.snapshot_json);
  return {
    id: cotizacion.id,
    dealId: cotizacion.deal_id,
    unitId: cotizacion.unit_id,
    unitCode: cotizacion.unit_code,
    unitTower: cotizacion.unit_tower,
    unitFloor: cotizacion.unit_floor,
    parqueadero: subInmueble(cotizacion.parking_id, cotizacion.parking_name),
    deposito: subInmueble(cotizacion.deposito_id, cotizacion.deposito_name),
    cuartoUtil: subInmueble(cotizacion.cuarto_util_id, cotizacion.cuarto_util_name),
    quoteType: cotizacion.quote_type,
    totalPrice: cotizacion.total_price,
    separation: cotizacion.separation,
    monthlyPayment: cotizacion.monthly_payment,
    numInstallments: cotizacion.num_installments,
    balance: cotizacion.balance,
    createdAt: cotizacion.created_at,
    planDePago: snap?.paymentPlan ?? null,
    saldoContraentrega: snap?.calc?.saldo ?? cotizacion.balance ?? null,
    contactoSnapshot: snap?.deal
      ? { cedula: snap.deal.contact_identification ?? null, email: snap.deal.contact_email ?? null, telefono: snap.deal.contact_phone ?? null }
      : null,
    informacionFinanciera: informacionFinanciera(snap),
  };
}

// { [dealId]: cotización } con la aceptada más reciente de cada negocio pedido; los que no tienen, no aparecen.
async function aceptadasPorNegocio(dealIds) {
  if (!dealIds.length) return {};
  const filas = await Cotizacion.findAll({ where: { deal_id: { [Op.in]: dealIds }, status: 'aceptada' }, order: [['created_at', 'DESC']] });
  const porNegocio = {};
  for (const fila of filas) if (!porNegocio[fila.deal_id]) porNegocio[fila.deal_id] = mapear(fila);
  return porNegocio;
}

module.exports = { aceptadasPorNegocio, informacionFinanciera };
