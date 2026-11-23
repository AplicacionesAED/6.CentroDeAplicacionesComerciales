// Vencimiento de cotizaciones de Oliv: pasados 8 dias sin aceptarse, la cotizacion "vence" y se desvinculan del negocio
// el inmueble y los accesorios inmobiliarios (parqueaderos, deposito, cuarto util); ademas se marcan "Disponible" los
// que nadie mas tiene.
//
// - Un inmueble/accesorio NO se toca si otra cotizacion del mismo negocio (aceptada, o pendiente y todavia vigente) lo
//   sigue usando.
// - Solo pasa a "Disponible" si ninguna cotizacion aceptada lo usa, ya no queda asociado a ningun negocio y su estado
//   actual es "Reservado" o "Separado" (nunca toca "Vendido").
// - La asociacion inmueble-parqueadero asignado NO se toca: solo se desvincula del NEGOCIO.
// - Los negocios que ya avanzaron de etapa (5 en adelante) se dejan intactos.
//
// Apagado por defecto: el servidor solo lo programa con EXPIRAR_COTIZACIONES=on (ver server.js). A mano:
// `npm run vencimientos` (simulacro) o `npm run vencimientos -- --aplicar`.
const { Op } = require('sequelize');
const { OBJETO_UNIDADES, OBJETO_ACCESORIOS } = require('../../utils/comercial');
const { clienteDeServicio } = require('../hubspot/hubspotApi');
const Cotizacion = require('./cotizacion.model');

const VIGENCIA_OLIV_DIAS = 8;
// Etapas 5 a 10 del pipeline de Oliv (cotizacion aceptada en adelante).
const ETAPAS_AVANZADAS_OLIV = new Set(['1275149864', '1497035347', '1224479047', '1282912351', '1282912352', '1275149865', '1224479049']);
const CAMPOS_ITEM = ['unit_id', 'parking_id', 'parking2_id', 'deposito_id', 'cuarto_util_id'];

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const usaItem = (itemId) => ({ [Op.or]: CAMPOS_ITEM.map((campo) => ({ [campo]: String(itemId) })) });
const mensajeError = (e) => `${e.hubspotStatus || ''} ${e.details?.hubspot?.message || e.message}`.trim();

async function usadoPorOtraCotizacionVigente(cotizacion, itemId, corte) {
  const n = await Cotizacion.count({
    where: {
      id: { [Op.ne]: cotizacion.id },
      deal_id: cotizacion.deal_id,
      [Op.and]: [usaItem(itemId), { [Op.or]: [{ status: 'aceptada' }, { status: 'pendiente', created_at: { [Op.gte]: corte } }] }],
    },
  });
  return n > 0;
}

const usadoPorCotizacionAceptada = async (itemId) => (await Cotizacion.count({ where: { status: 'aceptada', ...usaItem(itemId) } })) > 0;

// simulacro (por defecto true): solo lee y reporta, no escribe nada en HubSpot ni en la base.
async function procesarVencimientos({ simulacro = true, limite = 0, log = console.log } = {}) {
  const hs = clienteDeServicio();
  if (!hs) throw new Error('Falta HUBSPOT_SERVICE_TOKEN');
  const corte = new Date(Date.now() - VIGENCIA_OLIV_DIAS * 86400 * 1000);

  const vencidas = await Cotizacion.findAll({
    where: {
      status: 'pendiente',
      [Op.or]: [{ project: 'Oliv' }, { project: null }],
      vencida_procesada_at: null,
      created_at: { [Op.lt]: corte },
    },
    order: [['id', 'ASC']],
    ...(limite > 0 ? { limit: Number(limite) } : {}),
  });
  log(`[vencimiento] ${simulacro ? 'SIMULACRO: ' : ''}${vencidas.length} cotizaciones pendientes de Oliv con más de ${VIGENCIA_OLIV_DIAS} días`);

  const resumen = { cotizaciones: vencidas.length, desvinculados: 0, disponibles: 0, omitidos: 0, errores: 0, negociosAvanzados: 0 };
  const etapaPorNegocio = new Map();

  for (const q of vencidas) {
    if (!etapaPorNegocio.has(q.deal_id)) {
      try {
        const deal = await hs.get(`/crm/v3/objects/deals/${q.deal_id}`, { properties: 'dealstage' });
        etapaPorNegocio.set(q.deal_id, deal.properties?.dealstage || '');
      } catch (e) {
        etapaPorNegocio.set(q.deal_id, e.hubspotStatus === 404 ? 'BORRADO' : 'ERROR');
      }
    }
    const etapa = etapaPorNegocio.get(q.deal_id);
    if (ETAPAS_AVANZADAS_OLIV.has(etapa) || etapa === 'ERROR') {
      log(`  #${q.id} (${q.deal_name}): negocio ${etapa === 'ERROR' ? 'no se pudo leer' : 'en etapa avanzada'}, se omite`);
      resumen.negociosAvanzados++;
      continue;
    }

    const items = [
      { tipoObjeto: OBJETO_UNIDADES, id: q.unit_id, nombre: q.unit_code, propEstado: 'unit_status', etiqueta: 'inmueble' },
      { tipoObjeto: OBJETO_ACCESORIOS, id: q.parking_id, nombre: q.parking_name, propEstado: 'estado', etiqueta: 'parqueadero' },
      { tipoObjeto: OBJETO_ACCESORIOS, id: q.parking2_id, nombre: q.parking2_name, propEstado: 'estado', etiqueta: 'segundo parqueadero' },
      { tipoObjeto: OBJETO_ACCESORIOS, id: q.deposito_id, nombre: q.deposito_name, propEstado: 'estado', etiqueta: 'depósito' },
      { tipoObjeto: OBJETO_ACCESORIOS, id: q.cuarto_util_id, nombre: q.cuarto_util_name, propEstado: 'estado', etiqueta: 'cuarto útil' },
    ].filter((i) => i.id);

    let huboError = false;
    for (const item of items) {
      const tag = `#${q.id} (${q.deal_name}) ${item.etiqueta} ${item.nombre || item.id}`;
      try {
        if (await usadoPorOtraCotizacionVigente(q, item.id, corte)) {
          log(`  ${tag}: se conserva (otra cotización del negocio lo usa)`);
          resumen.omitidos++;
          continue;
        }

        // Negocios a los que sigue asociado, antes de desvincular.
        const asoc = await hs.get(`/crm/v4/objects/${item.tipoObjeto}/${item.id}/associations/deals`);
        const negocios = (asoc.results || []).map((r) => String(r.toObjectId || r.id));
        const asociadoAEsteNegocio = negocios.includes(String(q.deal_id));
        const quedanOtrosNegocios = negocios.some((id) => id !== String(q.deal_id));

        if (asociadoAEsteNegocio) {
          if (!simulacro) {
            await hs.post(`/crm/v4/associations/deals/${item.tipoObjeto}/batch/archive`, {
              inputs: [{ from: { id: String(q.deal_id) }, to: [{ id: String(item.id) }] }],
            });
          }
          resumen.desvinculados++;
          log(`  ${tag}: desvinculado del negocio [negocio ${q.deal_id} / ${item.tipoObjeto} ${item.id}]`);
        }

        // ¿Marcar Disponible? Solo si nadie mas lo tiene y esta Reservado/Separado.
        if (quedanOtrosNegocios) {
          log(`  ${tag}: sigue en otro negocio, no se cambia el estado`);
          continue;
        }
        if (await usadoPorCotizacionAceptada(item.id)) {
          log(`  ${tag}: lo usa una cotización aceptada, no se cambia el estado`);
          continue;
        }
        const objeto = await hs.get(`/crm/v3/objects/${item.tipoObjeto}/${item.id}`, { properties: item.propEstado });
        const estado = objeto.properties?.[item.propEstado];
        if (estado !== 'Reservado' && estado !== 'Separado') {
          log(`  ${tag}: estado "${estado || '—'}", no se cambia`);
          continue;
        }
        if (!simulacro) await hs.patch(`/crm/v3/objects/${item.tipoObjeto}/${item.id}`, { properties: { [item.propEstado]: 'Disponible' } });
        resumen.disponibles++;
        log(`  ${tag}: ${estado} → Disponible [${item.tipoObjeto} ${item.id}, estado anterior ${estado}]`);
      } catch (e) {
        huboError = true;
        resumen.errores++;
        log(`  ${tag}: ERROR ${mensajeError(e)}`);
      }
      await esperar(120);
    }

    if (!simulacro && !huboError) await q.update({ vencida_procesada_at: new Date() });
  }

  log(
    `[vencimiento] ${simulacro ? '(simulacro) ' : ''}desvinculados: ${resumen.desvinculados} | a Disponible: ${resumen.disponibles} | conservados: ${resumen.omitidos} | negocios omitidos (etapa avanzada): ${resumen.negociosAvanzados} | errores: ${resumen.errores}`
  );
  return resumen;
}

module.exports = { VIGENCIA_OLIV_DIAS, procesarVencimientos };
