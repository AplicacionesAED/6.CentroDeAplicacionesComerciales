// Inventario en HubSpot: unidades, torres y accesorios (parqueaderos, depositos, cuartos utiles). Todo se lee con
// el token del usuario; la lista de unidades de un proyecto se cachea 5 min.
const ApiError = require('../../utils/ApiError');
const { PROYECTOS, OBJETO_UNIDADES, OBJETO_TORRES, OBJETO_ACCESORIOS } = require('../../utils/comercial');
const { clienteDeUsuario, buscarTodos } = require('../hubspot/hubspotApi');
const { leerCache, guardarCache } = require('../hubspot/hubspotCache');
const { proyectosAsignados } = require('../asesorProyecto/asesorProyecto.service');

const PROPIEDADES_UNIDAD = [
  'id_unidad', 'torre', 'piso', 'codigo_unidad', 'valor_unidad_comercial', 'valor_m_comercial', 'built_area_m2', 'view_type',
  'private_area_m2', 'terrace_area_m2', 'property_type', 'unit_status', 'proyecto_inmobiliario', 'number_bedrooms',
  'number_bathrooms', 'bono', 'tipo_de_apartamento', 'floor_plan_link', 'estudios', 'plano_piso_sombreado',
];

// Todas las unidades de un proyecto, con la forma que usa la app.
async function unidadesDelProyecto(hs, proyecto) {
  const resultados = await buscarTodos(hs, `/crm/v3/objects/${OBJETO_UNIDADES}/search`, {
    filterGroups: [{ filters: [{ propertyName: 'proyecto_inmobiliario', operator: 'EQ', value: proyecto }] }],
    properties: PROPIEDADES_UNIDAD,
  });
  return resultados.map((item) => ({
    id: item.id,
    id_unidad: item.properties.id_unidad || '',
    torre: item.properties.torre || '',
    piso: Number(item.properties.piso) || 0,
    codigo_unidad: item.properties.codigo_unidad || '',
    valor_unidad_comercial: Number(item.properties.valor_unidad_comercial) || 0,
    valor_m_comercial: Number(item.properties.valor_m_comercial) || 0,
    area_construida: Number(item.properties.built_area_m2) || 0,
    tipo_vista: (item.properties.view_type || '').replace(/botanika/gi, 'Botanica').replace(/lejana mar/gi, 'Al Mar'),
    private_area_m2: Number(item.properties.private_area_m2) || 0,
    terrace_area_m2: Number(item.properties.terrace_area_m2) || 0,
    property_type: item.properties.property_type || '',
    unit_status: item.properties.unit_status || '',
    proyecto_inmobiliario: item.properties.proyecto_inmobiliario || '',
    alcobas: item.properties.number_bedrooms || '',
    banos: Number(item.properties.number_bathrooms) || 0,
    bono: Number(item.properties.bono) || 0,
    tipo_de_apartamento: item.properties.tipo_de_apartamento || '',
    floor_plan_link: item.properties.floor_plan_link || '',
    estudios: Number(item.properties.estudios) || 0,
    plano_piso_sombreado: item.properties.plano_piso_sombreado || '',
  }));
}

// Unidades de un proyecto. Por defecto solo las 'Disponible'; `todosLosEstados` devuelve todas (la cuadricula de
// torres tambien muestra las no disponibles). El filtro de disponibilidad se hace aqui y no en la busqueda de
// HubSpot, porque su indice tarda en reflejar registros recien actualizados.
async function unidades(usuario, { project, status, refresh }) {
  if (!usuario.esAdmin) {
    const asignados = await proyectosAsignados(usuario.id);
    if (asignados.length > 0 && !asignados.includes(project)) throw new ApiError(403, 'No tienes acceso a este proyecto');
  }

  const todosLosEstados = status === 'all';
  const clave = todosLosEstados ? `${project}_all_status` : `${project}_available`;
  if (!refresh) {
    const cacheado = await leerCache(clave);
    if (cacheado) return { units: cacheado, cached: true };
  }

  const delProyecto = await unidadesDelProyecto(clienteDeUsuario(usuario.id), project);
  const resultado = todosLosEstados ? delProyecto : delProyecto.filter((u) => u.unit_status === 'Disponible');
  await guardarCache(clave, resultado);
  return { units: resultado, cached: false };
}

// Todas las unidades de los 4 proyectos (solo admin).
async function inventarioCompleto(usuario) {
  const hs = clienteDeUsuario(usuario.id);
  const porProyecto = await Promise.all(PROYECTOS.map((p) => unidadesDelProyecto(hs, p)));
  return { units: porProyecto.flat() };
}

const nombreTorre = (t) => t.properties.nombre_de_la_torre || `Torre ${t.id}`;

// Torres con los ids de sus unidades asociadas (solo las que tienen unidades).
async function torres(usuario) {
  const hs = clienteDeUsuario(usuario.id);
  const lista = await hs.get(`/crm/v3/objects/${OBJETO_TORRES}`, { properties: 'nombre_de_la_torre', limit: 100 });
  const conUnidades = await Promise.all(
    (lista.results || []).map(async (torre) => {
      try {
        const asoc = await hs.get(`/crm/v4/objects/${OBJETO_TORRES}/${torre.id}/associations/${OBJETO_UNIDADES}`);
        return { id: torre.id, name: nombreTorre(torre), unitIds: (asoc.results || []).map((r) => String(r.toObjectId)) };
      } catch {
        return { id: torre.id, name: nombreTorre(torre), unitIds: [] };
      }
    })
  );
  return { towers: conUnidades.filter((t) => t.unitIds.length > 0) };
}

// Torre asociada a una unidad; { tower: null } si no tiene o HubSpot falla.
async function torreDeUnidad(usuario, unitId) {
  const hs = clienteDeUsuario(usuario.id);
  try {
    const asoc = await hs.get(`/crm/v4/objects/${OBJETO_UNIDADES}/${unitId}/associations/${OBJETO_TORRES}`);
    const ids = (asoc.results || []).map((r) => String(r.toObjectId));
    if (ids.length === 0) return { tower: null };
    const torre = await hs.get(`/crm/v3/objects/${OBJETO_TORRES}/${ids[0]}`, { properties: 'nombre_de_la_torre' });
    return { tower: { id: torre.id, name: nombreTorre(torre) } };
  } catch (e) {
    console.error('[inventario] No se pudo leer la torre de la unidad:', e.details ?? e.message);
    return { tower: null };
  }
}

const TIPOS_ACCESORIO = { Depósito: 'Depósito', 'Cuarto Útil': 'Cuarto Útil' };

// Accesorios de una torre. Con `dealId` incluye tambien los ya asociados a ese negocio (aunque no esten
// 'Disponible' o sean de otra torre): si no, un accesorio separado por una cotizacion previa del mismo negocio
// desapareceria del selector sin forma de volver a elegirlo.
async function accesorios(usuario, towerId, dealId) {
  const hs = clienteDeUsuario(usuario.id);
  const deTorre = await hs.get(`/crm/v4/objects/${OBJETO_TORRES}/${towerId}/associations/${OBJETO_ACCESORIOS}`);
  const idsTorre = (deTorre.results || []).map((r) => String(r.toObjectId));

  let idsNegocio = [];
  if (dealId) {
    try {
      const deNegocio = await hs.get(`/crm/v4/objects/deals/${dealId}/associations/${OBJETO_ACCESORIOS}`);
      idsNegocio = (deNegocio.results || []).map((r) => String(r.toObjectId));
    } catch (e) {
      console.error('[inventario] No se pudieron leer los accesorios del negocio:', e.details ?? e.message);
    }
  }

  const ids = [...new Set([...idsTorre, ...idsNegocio])];
  if (ids.length === 0) return { parking: [] };

  const lote = await hs.post(`/crm/v3/objects/${OBJETO_ACCESORIOS}/batch/read`, {
    inputs: ids.map((id) => ({ id })),
    properties: ['identificador_del_accesorio', 'precio', 'estado', 'tipo_de_accesorio'],
  });
  const delNegocio = new Set(idsNegocio);
  const lista = (lote.results || [])
    .map((item) => ({
      id: item.id,
      name: item.properties.identificador_del_accesorio || item.id,
      price: Number(item.properties.precio) || 0,
      status: item.properties.estado || '',
      tipo: TIPOS_ACCESORIO[item.properties.tipo_de_accesorio] || 'Parqueadero',
      reservedByThisDeal: delNegocio.has(item.id),
    }))
    .filter((a) => a.status === 'Disponible' || a.reservedByThisDeal);

  return {
    parking: lista.filter((a) => a.tipo === 'Parqueadero'),
    depositos: lista.filter((a) => a.tipo === 'Depósito'),
    cuartosUtiles: lista.filter((a) => a.tipo === 'Cuarto Útil'),
  };
}

// Asociacion por defecto (sin etiqueta): cuerpo vacio, soportado por CRM v4.
async function asociar(usuario, dealId, tipoObjeto, objetoId) {
  await clienteDeUsuario(usuario.id).put(`/crm/v4/objects/deals/${dealId}/associations/${tipoObjeto}/${objetoId}`, []);
  return { success: true };
}

const asociarUnidad = (usuario, dealId, unitId) => asociar(usuario, dealId, OBJETO_UNIDADES, unitId);
const asociarParqueadero = (usuario, dealId, parkingId) => asociar(usuario, dealId, OBJETO_ACCESORIOS, parkingId);

module.exports = { unidades, inventarioCompleto, torres, torreDeUnidad, accesorios, asociarUnidad, asociarParqueadero };
