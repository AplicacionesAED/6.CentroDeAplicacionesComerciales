// Separacion vencida (Oliv): cuando un negocio cumple 15 dias en "Etapa 5 - Cotizacion aceptada - separacion" sin
// avanzar, se mueve a "Etapa 5.5 - Separacion vencida", se le retira el inmueble y el parqueadero, esos pasan a
// "Disponible" y se deja una nota en el negocio.
//
// Reglas de seguridad:
// - Si el inmueble o el parqueadero esta "Vendido", el negocio no se toca (se reporta para revisarlo a mano).
// - Un inmueble/parqueadero solo pasa a "Disponible" si estaba "Reservado" o "Separado", ya no queda asociado a ningun
//   negocio y ninguna cotizacion aceptada de OTRO negocio lo usa.
// - Solo se retiran inmuebles y parqueaderos; depositos y cuartos utiles no se tocan.
//
// Apagado por defecto: el servidor solo lo programa con EXPIRAR_SEPARACIONES=on (ver server.js). A mano:
// `npm run separaciones-vencidas` (simulacro) o `npm run separaciones-vencidas -- --aplicar`.
const { Op } = require('sequelize');
const { ETAPAS_POR_PROYECTO, OBJETO_UNIDADES, OBJETO_ACCESORIOS } = require('../../utils/comercial');
const { clienteDeServicio, buscarTodos } = require('../hubspot/hubspotApi');
const Cotizacion = require('./cotizacion.model');

const PIPELINE_OLIV = '827192663';
const ETAPA_5 = ETAPAS_POR_PROYECTO.Oliv.aceptada;
const ETAPA_5_5 = '1497035347';
const DIAS_SEPARACION = 15;
const CAMPOS_ITEM = ['unit_id', 'parking_id', 'parking2_id', 'deposito_id', 'cuarto_util_id'];

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const mensajeError = (e) => `${e.hubspotStatus || ''} ${e.details?.hubspot?.message || e.message}`.trim();

async function usadoPorAceptadaDeOtroNegocio(itemId, dealId) {
  const n = await Cotizacion.count({
    where: { status: 'aceptada', deal_id: { [Op.ne]: String(dealId) }, [Op.or]: CAMPOS_ITEM.map((campo) => ({ [campo]: String(itemId) })) },
  });
  return n > 0;
}

const fechaLarga = (d) => new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Bogota' });

// Nota que queda en el negocio. `retirados`: [{ tipo: 'Inmueble' | 'Parqueadero', nombre, destino }]
function construirNota({ retirados, desde, dias, cotizacion }) {
  const inm = retirados.filter((r) => r.tipo === 'Inmueble').map((r) => r.nombre);
  const par = retirados.filter((r) => r.tipo === 'Parqueadero').map((r) => r.nombre);
  const partes = [];
  if (inm.length) partes.push(`${inm.length > 1 ? 'los inmuebles' : 'el inmueble'} ${inm.join(', ')}`);
  if (par.length) partes.push(`${par.length > 1 ? 'los parqueaderos' : 'el parqueadero'} ${par.join(', ')}`);
  const retiro = partes.length ? `, se retiró ${partes.join(' y ')} del negocio` : '';
  const filas = [
    `<li><strong>En Etapa 5 desde:</strong> ${fechaLarga(desde)} (${dias} días)</li>`,
    cotizacion ? `<li><strong>Cotización aceptada de referencia:</strong> N° ${cotizacion.id}${cotizacion.unit_code ? ` (${cotizacion.unit_code})` : ''}</li>` : '',
    ...retirados.map((r) => `<li><strong>${r.tipo} retirado:</strong> ${r.nombre} — ${r.destino}</li>`),
  ]
    .filter(Boolean)
    .join('');
  return (
    `<p><strong>Separación vencida — movimiento automático de etapa</strong></p>` +
    `<p>Se mueve a etapa 5.5 (Separación vencida) debido a que pasaron más de ${DIAS_SEPARACION} días sin movimiento de aceptación${retiro}.</p>` +
    `<ul>${filas}</ul>` +
    `<p>Para retomar la compra se debe generar y aceptar una nueva cotización.</p>` +
    `<p><em>Movimiento realizado automáticamente por el Cotizador AED el ${fechaLarga(Date.now())}.</em></p>`
  );
}

// simulacro (por defecto true): solo lee y reporta; no mueve etapas, no desvincula, no cambia estados ni crea notas.
async function procesarSeparacionesVencidas({ simulacro = true, limite = 0, log = console.log } = {}) {
  const hs = clienteDeServicio();
  if (!hs) throw new Error('Falta HUBSPOT_SERVICE_TOKEN');
  const corteMs = Date.now() - DIAS_SEPARACION * 86400 * 1000;
  const prop = `hs_v2_date_entered_${ETAPA_5}`;

  // Negocios de Oliv en etapa 5 desde hace mas de 15 dias.
  const negocios = await buscarTodos(hs, '/crm/v3/objects/deals/search', {
    filterGroups: [
      {
        filters: [
          { propertyName: 'pipeline', operator: 'EQ', value: PIPELINE_OLIV },
          { propertyName: 'dealstage', operator: 'EQ', value: ETAPA_5 },
          { propertyName: prop, operator: 'LT', value: String(corteMs) },
        ],
      },
    ],
    properties: ['dealname', prop],
    sorts: [{ propertyName: prop, direction: 'ASCENDING' }],
  });
  const lista = limite > 0 ? negocios.slice(0, limite) : negocios;
  log(`[separaciones] ${simulacro ? 'SIMULACRO: ' : ''}${lista.length} negocios de Oliv con más de ${DIAS_SEPARACION} días en etapa 5`);

  const resumen = { negocios: lista.length, movidos: 0, retirados: 0, disponibles: 0, omitidos: 0, errores: 0 };

  const asociados = async (dealId, tipoObjeto) =>
    ((await hs.get(`/crm/v4/objects/deals/${dealId}/associations/${tipoObjeto}`)).results || []).map((r) => String(r.toObjectId || r.id));
  const leer = async (tipoObjeto, ids, propiedades) =>
    ids.length === 0 ? [] : (await hs.post(`/crm/v3/objects/${tipoObjeto}/batch/read`, { inputs: ids.map((id) => ({ id })), properties: propiedades })).results || [];

  for (const d of lista) {
    const nombreNegocio = (d.properties.dealname || d.id).trim();
    const desde = (d.properties[prop] || '').slice(0, 10);
    const tag = `negocio ${d.id} (${nombreNegocio}, en etapa 5 desde ${desde})`;
    try {
      const unidades = (await leer(OBJETO_UNIDADES, await asociados(d.id, OBJETO_UNIDADES), ['codigo_unidad', 'unit_status'])).map((o) => ({
        tipoObjeto: OBJETO_UNIDADES,
        id: String(o.id),
        nombre: o.properties.codigo_unidad || o.id,
        propEstado: 'unit_status',
        estado: o.properties.unit_status,
      }));
      const parqueaderos = (await leer(OBJETO_ACCESORIOS, await asociados(d.id, OBJETO_ACCESORIOS), ['identificador_del_accesorio', 'estado', 'tipo_de_accesorio']))
        .filter((o) => (o.properties.tipo_de_accesorio || 'Parqueadero') === 'Parqueadero')
        .map((o) => ({
          tipoObjeto: OBJETO_ACCESORIOS,
          id: String(o.id),
          nombre: o.properties.identificador_del_accesorio || o.id,
          propEstado: 'estado',
          estado: o.properties.estado,
        }));
      const items = [...unidades, ...parqueaderos];

      const vendido = items.find((i) => i.estado === 'Vendido');
      if (vendido) {
        log(`  ${tag}: OMITIDO: ${vendido.nombre} está "Vendido", revisar a mano`);
        resumen.omitidos++;
        continue;
      }

      // Cotizacion aceptada del negocio (referencia para la nota; si ya no hay nada asociado, de ahi salen los nombres).
      const cotizacion = await Cotizacion.findOne({
        where: { deal_id: String(d.id), status: 'aceptada' },
        attributes: ['id', 'unit_code', 'parking_name', 'parking2_name'],
        order: [['id', 'DESC']],
      });
      const retirados = [];

      for (const item of items) {
        if (!simulacro) {
          await hs.post(`/crm/v4/associations/deals/${item.tipoObjeto}/batch/archive`, { inputs: [{ from: { id: String(d.id) }, to: [{ id: item.id }] }] });
        }
        resumen.retirados++;
        log(`  ${tag}: retira ${item.nombre} del negocio`);
        const registro = {
          tipo: item.tipoObjeto === OBJETO_UNIDADES ? 'Inmueble' : 'Parqueadero',
          nombre: item.nombre,
          destino: item.estado === 'Disponible' ? 'ya estaba Disponible' : `estado sin cambios (${item.estado || 'sin estado'})`,
        };
        retirados.push(registro);

        if (item.estado !== 'Reservado' && item.estado !== 'Separado') {
          log(`  ${tag}: ${item.nombre} estado "${item.estado || '—'}", no se cambia`);
          continue;
        }
        const otros = ((await hs.get(`/crm/v4/objects/${item.tipoObjeto}/${item.id}/associations/deals`)).results || [])
          .map((r) => String(r.toObjectId || r.id))
          .filter((id) => id !== String(d.id));
        if (otros.length > 0) {
          log(`  ${tag}: ${item.nombre} sigue en otro negocio, no se cambia el estado`);
          continue;
        }
        if (await usadoPorAceptadaDeOtroNegocio(item.id, d.id)) {
          log(`  ${tag}: ${item.nombre} lo usa una cotización aceptada de otro negocio, no se cambia el estado`);
          continue;
        }
        if (!simulacro) await hs.patch(`/crm/v3/objects/${item.tipoObjeto}/${item.id}`, { properties: { [item.propEstado]: 'Disponible' } });
        resumen.disponibles++;
        registro.destino = 'queda Disponible';
        log(`  ${tag}: ${item.nombre} ${item.estado} → Disponible [${item.tipoObjeto} ${item.id}]`);
      }

      if (items.length === 0 && cotizacion) {
        // Nada asociado (ya se habia retirado antes): los nombres salen de la cotizacion aceptada.
        if (cotizacion.unit_code) retirados.push({ tipo: 'Inmueble', nombre: cotizacion.unit_code, destino: 'ya no estaba asociado al negocio' });
        for (const n of [cotizacion.parking_name, cotizacion.parking2_name].filter(Boolean)) {
          retirados.push({ tipo: 'Parqueadero', nombre: n, destino: 'ya no estaba asociado al negocio' });
        }
      }
      const dias = Math.floor((Date.now() - new Date(d.properties[prop]).getTime()) / 86400000);
      const nota = construirNota({ retirados, desde: d.properties[prop], dias, cotizacion });

      if (!simulacro) {
        await hs.patch(`/crm/v3/objects/deals/${d.id}`, { properties: { dealstage: ETAPA_5_5 } });
        await hs.post('/crm/v3/objects/notes', {
          properties: { hs_note_body: nota, hs_timestamp: new Date().toISOString() },
          associations: [{ to: { id: String(d.id) }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 214 }] }],
        });
      }
      resumen.movidos++;
      const notaTexto = nota.replace(/<li>/g, '\n      - ').replace(/<\/p>/g, '\n      ').replace(/<[^>]+>/g, '');
      log(`  ${tag}: → Etapa 5.5. Nota: ${notaTexto}`);
    } catch (e) {
      resumen.errores++;
      log(`  ${tag}: ERROR ${mensajeError(e)}`);
    }
    await esperar(150);
  }

  log(
    `[separaciones] ${simulacro ? '(simulacro) ' : ''}movidos a 5.5: ${resumen.movidos} | retirados: ${resumen.retirados} | a Disponible: ${resumen.disponibles} | omitidos: ${resumen.omitidos} | errores: ${resumen.errores}`
  );
  return resumen;
}

module.exports = { DIAS_SEPARACION, construirNota, procesarSeparacionesVencidas };
