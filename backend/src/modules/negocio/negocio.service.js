// Negocios (deals) de HubSpot visibles para el usuario: un admin ve todos; los demas, los suyos (por dueno) y,
// si tienen proyectos asignados, solo los de esos proyectos. El resultado se cachea 5 min (ver hubspotCache.js).
const { clienteDeUsuario, buscarTodos } = require('../hubspot/hubspotApi');
const { leerCache, guardarCache } = require('../hubspot/hubspotCache');
const { emailComercial } = require('../../utils/comercial');
const { proyectosAsignados } = require('../asesorProyecto/asesorProyecto.service');
const { actividadPorNegocio, ultimaPorNegocio } = require('../cotizacion/cotizacion.service');

const RUTA_BUSQUEDA = '/crm/v3/objects/deals/search';

// `ordenar`: solo el listado de un admin lo pide (mas recientes primero).
async function buscarNegocios(hs, usuario, propiedades, { ordenar = false } = {}) {
  if (usuario.esAdmin) {
    return buscarTodos(hs, RUTA_BUSQUEDA, { filterGroups: [], properties: propiedades, ...(ordenar ? { sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }] } : {}) });
  }
  const duenos = await hs.get('/crm/v3/owners', { email: emailComercial(usuario), limit: 1 });
  const ownerId = duenos.results?.[0]?.id;
  if (!ownerId) return [];
  return buscarTodos(hs, RUTA_BUSQUEDA, {
    filterGroups: [{ filters: [{ propertyName: 'hubspot_owner_id', operator: 'EQ', value: ownerId }] }],
    properties: propiedades,
  });
}

// Mapa idEtapa -> { label, etapa (posicion 1-based en SU pipeline), probability }.
async function mapaEtapas(hs) {
  const pipelines = await hs.get('/crm/v3/pipelines/deals');
  const etapas = {};
  for (const pipeline of pipelines.results || []) {
    (pipeline.stages || []).forEach((stage, idx) => {
      etapas[stage.id] = { label: stage.label, etapa: idx + 1, probability: Number(stage.metadata?.probability ?? 1) };
    });
  }
  return etapas;
}

// Clave de cache: los admins comparten una; cada vendedor tiene la suya.
const claveCache = (prefijo, usuario) => `${prefijo}${usuario.esAdmin ? '__admin__' : usuario.hubspot_user_id || `u${usuario.id}`}`;

async function listar(usuario, { refresh }) {
  const clave = claveCache('deals_', usuario);
  if (!refresh) {
    const cacheado = await leerCache(clave);
    if (cacheado) return { deals: cacheado, cached: true };
  }

  const hs = clienteDeUsuario(usuario.id);
  const brutos = await buscarNegocios(
    hs,
    usuario,
    ['dealname', 'dealstage', 'pipeline', 'hubspot_owner_id', 'nombre_contacto', 'proyecto_inmobiliario_cac', 'createdate', 'amount', 'hs_last_activity_date'],
    { ordenar: true }
  );
  let deals = brutos.map((d) => ({
    id: d.id,
    dealname: d.properties.dealname || '',
    dealstage: d.properties.dealstage || '',
    pipeline: d.properties.pipeline || '',
    nombre_contacto: d.properties.nombre_contacto || '',
    proyecto_inmobiliario_cac: d.properties.proyecto_inmobiliario_cac || '',
    createdate: d.properties.createdate || '',
    amount: Number(d.properties.amount) || 0,
    lastActivityDate: d.properties.hs_last_activity_date || null,
  }));

  // Un asesor con proyectos asignados solo ve los negocios de esos proyectos.
  if (!usuario.esAdmin) {
    const asignados = await proyectosAsignados(usuario.id);
    if (asignados.length > 0) deals = deals.filter((d) => asignados.includes(d.proyecto_inmobiliario_cac));
  }

  // El id de la etapa se reemplaza por su nombre; si HubSpot no responde se dejan los ids.
  try {
    const etapas = await mapaEtapas(hs);
    deals = deals.map((d) => ({ ...d, dealstage: etapas[d.dealstage]?.label || d.dealstage }));
  } catch (e) {
    console.warn('[negocios] No se pudieron leer las etapas del pipeline, se dejan los ids:', e.message);
  }

  const actividad = await actividadPorNegocio();
  deals = deals.map((d) => ({
    ...d,
    lastQuoteDate: actividad[d.id]?.lastQuoteDate || null,
    quoteCount: actividad[d.id]?.quoteCount || 0,
    hasAccepted: actividad[d.id]?.hasAccepted || false,
  }));

  await guardarCache(clave, deals);
  return { deals, cached: false };
}

// Negocios en etapa 6 o posterior de su pipeline (en tramite), cada uno con el precio/inmueble de su cotizacion
// mas representativa y su estado real en el CRM. Se vuelve a buscar (en vez de reusar `listar`) porque aqui
// hace falta el ORDEN de la etapa, que `listar` descarta al cambiar el id por su nombre.
async function tramites(usuario, { refresh }) {
  const clave = claveCache('tramites_', usuario);
  if (!refresh) {
    const cacheado = await leerCache(clave);
    if (cacheado) return { tramites: cacheado, cached: true };
  }

  const hs = clienteDeUsuario(usuario.id);
  const brutos = await buscarNegocios(hs, usuario, ['dealname', 'dealstage', 'pipeline', 'hubspot_owner_id', 'proyecto_inmobiliario_cac']);
  let negocios = brutos.map((d) => ({
    id: d.id,
    dealname: d.properties.dealname || '',
    dealstageId: d.properties.dealstage || '',
    pipelineId: d.properties.pipeline || '',
    project: d.properties.proyecto_inmobiliario_cac || '',
  }));

  if (!usuario.esAdmin) {
    const asignados = await proyectosAsignados(usuario.id);
    if (asignados.length > 0) negocios = negocios.filter((d) => asignados.includes(d.project));
  }

  const etapas = await mapaEtapas(hs);
  const cotizacionPorNegocio = await ultimaPorNegocio();

  const resultado = negocios
    .map((d) => ({ ...d, stage: etapas[d.dealstageId] || { label: d.dealstageId, etapa: 0, probability: 1 } }))
    // etapa >= 6 y no "perdido/desistido" (probability 0 en todos los pipelines): esa etapa queda al final por posicion, no por avance real.
    .filter((d) => d.stage.etapa >= 6 && d.stage.probability > 0)
    .map((d) => {
      const q = cotizacionPorNegocio[d.id] || null;
      return {
        deal_id: d.id,
        deal_name: d.dealname,
        project: d.project,
        estado_crm: d.stage.label,
        etapa: d.stage.etapa,
        quote_id: q?.quote_id ?? null,
        quote_status: q?.status ?? null,
        total_price: q?.total_price ?? null,
        unit_code: q?.unit_code ?? null,
      };
    })
    .sort((a, b) => b.etapa - a.etapa);

  await guardarCache(clave, resultado);
  return { tramites: resultado, cached: false };
}

module.exports = { listar, tramites };
