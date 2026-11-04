// Aceptar una cotizacion: la marca aceptada en la BD (las demas del negocio vuelven a pendiente), sube el PDF
// a HubSpot como nota, avanza la etapa, deja en el negocio solo la unidad y los accesorios aceptados, y
// separa/libera unidad y accesorios en HubSpot. Los pasos de HubSpot posteriores a la BD son de mejor
// esfuerzo (se registran y se sigue), salvo la subida del PDF y la nota, que fallan la peticion como en la app vieja.
const { Op } = require('sequelize');
const sequelize = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { ETAPAS_POR_PROYECTO, OBJETO_UNIDADES, OBJETO_ACCESORIOS, sanitizarNombreArchivo } = require('../../utils/comercial');
const { clienteDeUsuario, clienteDeServicio, armarSubidaArchivo, borrarNotasPorTexto } = require('../hubspot/hubspotApi');
const Cotizacion = require('./cotizacion.model');
const { leerPdf, cargarVisible } = require('./cotizacion.service');

const OCHO_DIAS_MS = 8 * 86400 * 1000;
const fechaColombia = () =>
  new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

// Falla con 409 si el accesorio cotizado ya no esta 'Disponible' (otra cotizacion lo separo). Si HubSpot no
// responde, no bloquea la aceptacion.
async function verificarDisponible(hs, id, etiqueta, nombre) {
  if (!id) return;
  let estado = null;
  try {
    const r = await hs.get(`/crm/v3/objects/${OBJETO_ACCESORIOS}/${id}`, { properties: 'estado' });
    estado = r.properties?.estado;
  } catch (e) {
    console.warn(`[aceptar] No se pudo verificar la disponibilidad de ${etiqueta}:`, e.details ?? e.message);
  }
  if (estado && estado !== 'Disponible') {
    throw new ApiError(409, `El ${etiqueta} ${nombre || ''} ya no está disponible (${estado}). Crea una nueva cotización con un ${etiqueta} disponible.`);
  }
}

// Otras cotizaciones aceptadas del mismo negocio cuyo `campo` apunta a algo distinto del nuevo valor: al aceptar
// esta, esas unidades/accesorios vuelven a 'Disponible'.
async function otrasAceptadas(campo, dealId, excluirId, nuevoValor) {
  return Cotizacion.findAll({
    where: {
      deal_id: dealId,
      status: 'aceptada',
      id: { [Op.ne]: excluirId },
      [Op.and]: [{ [campo]: { [Op.ne]: null } }, { [campo]: { [Op.ne]: nuevoValor ?? '' } }],
    },
    attributes: ['id', campo],
  });
}

// Quita la asociacion de un objeto con todos los negocios menos `dealMantener`.
async function desvincularDeOtrosNegocios(hs, tipoObjeto, objetoId, dealMantener) {
  if (!objetoId) return;
  try {
    const r = await hs.get(`/crm/v4/objects/${tipoObjeto}/${objetoId}/associations/deals`);
    const otros = (r.results || []).map((x) => String(x.toObjectId || x.id)).filter((id) => id !== String(dealMantener));
    if (!otros.length) return;
    await hs.post(`/crm/v4/associations/deals/${tipoObjeto}/batch/archive`, { inputs: otros.map((id) => ({ from: { id }, to: [{ id: String(objetoId) }] })) });
  } catch (e) {
    console.warn(`[aceptar] No se pudo desvincular ${tipoObjeto}/${objetoId} de otros negocios:`, e.details ?? e.message);
  }
}

// Deja en el negocio solo los objetos asociados que se conservan.
async function dejarSoloAsociados(hs, dealId, tipoObjeto, conservar) {
  try {
    const r = await hs.get(`/crm/v4/objects/deals/${dealId}/associations/${tipoObjeto}`);
    const quitar = (r.results || []).map((x) => String(x.toObjectId || x.id)).filter((id) => !conservar.has(id));
    if (quitar.length) {
      await hs.post(`/crm/v4/associations/deals/${tipoObjeto}/batch/archive`, { inputs: quitar.map((id) => ({ from: { id: String(dealId) }, to: [{ id }] })) });
    }
  } catch (e) {
    console.error(`[aceptar] No se pudieron quitar las asociaciones sobrantes de ${tipoObjeto}:`, e.details ?? e.message);
  }
}

// Cambia propiedades de un objeto personalizado con el token de servicio. Mejor esfuerzo.
async function marcar(servicio, tipoObjeto, id, propiedades, descripcion) {
  try {
    await servicio.patch(`/crm/v3/objects/${tipoObjeto}/${id}`, { properties: propiedades });
  } catch (e) {
    console.warn(`[aceptar] No se pudo ${descripcion}:`, e.details ?? e.message);
  }
}

async function aceptar(usuario, id) {
  const hs = clienteDeUsuario(usuario.id);
  const cotizacion = await cargarVisible(usuario, id);

  // Vence a los 8 dias; un admin puede aceptarla igual.
  if (!usuario.esAdmin && Date.now() - cotizacion.created_at.getTime() > OCHO_DIAS_MS) {
    throw new ApiError(422, 'Esta cotización ha vencido (más de 8 días) y no puede ser aceptada.');
  }

  await verificarDisponible(hs, cotizacion.parking_id, 'parqueadero', cotizacion.parking_name);
  await verificarDisponible(hs, cotizacion.deposito_id, 'depósito', cotizacion.deposito_name);
  await verificarDisponible(hs, cotizacion.cuarto_util_id, 'cuarto útil', cotizacion.cuarto_util_name);

  // Se leen ANTES de resetear los estados.
  const otrosParqueaderos = await otrasAceptadas('parking_id', cotizacion.deal_id, id, cotizacion.parking_id);
  const otrosDepositos = await otrasAceptadas('deposito_id', cotizacion.deal_id, id, cotizacion.deposito_id);
  const otrosCuartos = await otrasAceptadas('cuarto_util_id', cotizacion.deal_id, id, cotizacion.cuarto_util_id);
  const otrasUnidades = await otrasAceptadas('unit_id', cotizacion.deal_id, id, cotizacion.unit_id);

  // 1. Aceptada en la BD; las demas del negocio vuelven a pendiente.
  await sequelize.transaction(async (transaction) => {
    await Cotizacion.update({ status: 'pendiente' }, { where: { deal_id: cotizacion.deal_id, status: 'aceptada' }, transaction });
    await Cotizacion.update({ status: 'aceptada' }, { where: { id }, transaction });
  });

  // 2. Nombre del cliente para el archivo.
  let cliente = 'CLIENTE';
  try {
    const deal = await hs.get(`/crm/v3/objects/deals/${cotizacion.deal_id}`, { properties: 'nombre_contacto_,nombre_contacto' });
    const p = deal.properties || {};
    cliente = (p.nombre_contacto_ || p.nombre_contacto || 'CLIENTE').trim();
  } catch (e) {
    console.warn('[aceptar] No se pudo leer el nombre del cliente:', e.details ?? e.message);
  }

  // 3. Notas anteriores.
  await borrarNotasPorTexto(hs, cotizacion.deal_id, 'Cotización aceptada');
  await borrarNotasPorTexto(hs, cotizacion.deal_id, 'Cotización generada');

  // 4. PDF a HubSpot con su nota, etapa "aceptada" y fecha de aceptacion.
  if (cotizacion.pdf_filename) {
    const pdf = await leerPdf(cotizacion);
    if (pdf) {
      const nombrePdf = `COTIZACION-${sanitizarNombreArchivo(cliente)}-${sanitizarNombreArchivo(cotizacion.unit_code || 'NA')}-${new Date().toISOString().slice(0, 10)}.pdf`;
      const subida = await hs.subir('/files/v3/files', armarSubidaArchivo(pdf, nombrePdf));
      await hs.post('/crm/v3/objects/notes', {
        properties: {
          hs_timestamp: new Date().toISOString(),
          hs_note_body: `Cotización aceptada - ${cotizacion.unit_code || 'N/A'} - ${cotizacion.quote_type}`,
          hs_attachment_ids: String(subida.id),
        },
        associations: [{ to: { id: cotizacion.deal_id }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 214 }] }],
      });

      try {
        const etapas = ETAPAS_POR_PROYECTO[cotizacion.project || 'Oliv'];
        const propiedades = { fecha_ultima_cotizacion_aceptada: fechaColombia() };
        if (etapas) propiedades.dealstage = etapas.aceptada;
        else console.warn(`[aceptar] Proyecto "${cotizacion.project}" no reconocido: no se avanza la etapa`);
        await hs.patch(`/crm/v3/objects/deals/${cotizacion.deal_id}`, { properties: propiedades });
      } catch (e) {
        console.warn('[aceptar] No se pudo actualizar la etapa del negocio:', e.details ?? e.message);
      }
    }
  }

  // 5. El negocio conserva solo la unidad y los accesorios aceptados.
  await dejarSoloAsociados(hs, cotizacion.deal_id, OBJETO_UNIDADES, new Set([String(cotizacion.unit_id)]));
  await dejarSoloAsociados(
    hs,
    cotizacion.deal_id,
    OBJETO_ACCESORIOS,
    new Set([cotizacion.parking_id, cotizacion.deposito_id, cotizacion.cuarto_util_id].filter(Boolean).map(String))
  );

  // 6. Monto y unidad en el negocio.
  try {
    await hs.patch(`/crm/v3/objects/deals/${cotizacion.deal_id}`, {
      properties: { amount: String(cotizacion.total_price), unidad_separada_48_horas: cotizacion.unit_code, ultima_unidad_cotizada: cotizacion.unit_code },
    });
  } catch (e) {
    console.error('[aceptar] No se pudo actualizar el monto del negocio:', e.details ?? e.message);
  }

  // 7. Estado de unidad y accesorios: separar los aceptados y liberar los de cotizaciones aceptadas antes. Escribir
  // propiedades de objetos personalizados exige crm.objects.custom.write, que el OAuth de la app no tiene.
  const servicio = clienteDeServicio();
  if (servicio) {
    if (cotizacion.unit_id) await marcar(servicio, OBJETO_UNIDADES, cotizacion.unit_id, { unit_status: 'Separado' }, 'marcar la unidad como Separado');
    for (const fila of otrasUnidades) await marcar(servicio, OBJETO_UNIDADES, fila.unit_id, { unit_status: 'Disponible' }, 'liberar la unidad anterior');
    for (const [idAcc, etiqueta] of [
      [cotizacion.parking_id, 'el parqueadero'],
      [cotizacion.deposito_id, 'el depósito'],
      [cotizacion.cuarto_util_id, 'el cuarto útil'],
    ]) {
      if (idAcc) await marcar(servicio, OBJETO_ACCESORIOS, idAcc, { estado: 'Separado' }, `marcar ${etiqueta} como Separado`);
    }
    for (const [filas, campo, etiqueta] of [
      [otrosParqueaderos, 'parking_id', 'el parqueadero anterior'],
      [otrosDepositos, 'deposito_id', 'el depósito anterior'],
      [otrosCuartos, 'cuarto_util_id', 'el cuarto útil anterior'],
    ]) {
      for (const fila of filas) await marcar(servicio, OBJETO_ACCESORIOS, fila[campo], { estado: 'Disponible' }, `liberar ${etiqueta}`);
    }
  } else {
    console.warn('[aceptar] HUBSPOT_SERVICE_TOKEN no está definido: no se actualiza el estado de unidad ni accesorios');
  }

  // 8. Solo el negocio que acepta queda asociado a la unidad y a los accesorios.
  await desvincularDeOtrosNegocios(hs, OBJETO_UNIDADES, cotizacion.unit_id, cotizacion.deal_id);
  await desvincularDeOtrosNegocios(hs, OBJETO_ACCESORIOS, cotizacion.parking_id, cotizacion.deal_id);
  await desvincularDeOtrosNegocios(hs, OBJETO_ACCESORIOS, cotizacion.deposito_id, cotizacion.deal_id);
  await desvincularDeOtrosNegocios(hs, OBJETO_ACCESORIOS, cotizacion.cuarto_util_id, cotizacion.deal_id);

  return { success: true };
}

module.exports = { aceptar };
