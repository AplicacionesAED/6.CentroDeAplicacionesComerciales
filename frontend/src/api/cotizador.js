// Llamadas del Cotizador al backend. La sesion viaja en cookies (client.js): ninguna funcion recibe un token de
// HubSpot. Lo que sale de /hubspot/* es la respuesta cruda de HubSpot (por eso `getRaw`/`postRaw`); el resto
// llega dentro de `{ data }` y client.js ya lo desenvuelve.
import client from './client.js';

const PROPIEDADES_UNIDAD = [
  'id_unidad', 'torre', 'piso', 'codigo_unidad', 'valor_unidad_comercial', 'valor_m_comercial', 'built_area_m2', 'view_type',
  'private_area_m2', 'terrace_area_m2', 'property_type', 'unit_status', 'number_bedrooms', 'number_bathrooms', 'bono',
  'tipo_de_apartamento', 'floor_plan_link', 'estudios', 'plano_piso_sombreado',
];

const OBJETO_UNIDADES = import.meta.env.VITE_HUBSPOT_OBJECT_ID || '2-51798334';

const mapearUnidad = (item) => ({
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
  alcobas: item.properties.number_bedrooms || '',
  banos: Number(item.properties.number_bathrooms) || 0,
  bono: Number(item.properties.bono) || 0,
  tipo_de_apartamento: item.properties.tipo_de_apartamento || '',
  floor_plan_link: item.properties.floor_plan_link || '',
  estudios: Number(item.properties.estudios) || 0,
  plano_piso_sombreado: item.properties.plano_piso_sombreado || '',
});

// Unidades asociadas a un negocio de HubSpot.
export async function fetchUnits(dealId) {
  let ids;
  try {
    const { data } = await client.getRaw(`/hubspot/crm/v4/objects/deals/${dealId}/associations/${OBJETO_UNIDADES}`);
    ids = (data.results || []).map((r) => r.toObjectId || r.id);
  } catch {
    return [];
  }
  if (ids.length === 0) return [];
  const { data } = await client.postRaw(`/hubspot/crm/v3/objects/${OBJETO_UNIDADES}/batch/read`, {
    inputs: ids.map((id) => ({ id })),
    properties: PROPIEDADES_UNIDAD,
  });
  return (data.results || []).map(mapearUnidad);
}

async function fetchOwner(ownerId) {
  if (!ownerId) return { name: '', email: '', phone: '' };
  try {
    const { data } = await client.getRaw(`/hubspot/crm/v3/owners/${ownerId}`);
    return { name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || ownerId, email: data.email || '', phone: data.mobilePhone || '' };
  } catch (e) {
    console.warn('No se pudieron leer los datos del asesor', e);
    return { name: ownerId, email: '', phone: '' };
  }
}

// Detalle de un negocio con su asesor y los datos de su contacto.
export async function fetchDeal(dealId) {
  const propiedades = ['dealname', 'hubspot_owner_id', 'nombre_contacto', 'proyecto_inmobiliario_cac', 'destino_del_inmueble', 'alcobas', 'descuento_especial'];
  const { data } = await client.getRaw(`/hubspot/crm/v3/objects/deals/${dealId}?properties=${propiedades.join(',')}`);
  const ownerId = data.properties.hubspot_owner_id;
  const owner = ownerId ? await fetchOwner(ownerId) : { name: ownerId, email: '', phone: '' };

  // Alegra lleva los ingresos en su propia propiedad; los demas proyectos usan la compartida.
  const ingresosProp = data.properties.proyecto_inmobiliario_cac === 'Alegra' ? 'ingresos_mensuales_alegra' : 'ingresos_mensuales';
  let contacto = { email: '', phone: '', identification: '', ingresosMensuales: undefined };
  try {
    const asoc = await client.getRaw(`/hubspot/crm/v3/objects/deals/${dealId}/associations/contacts`);
    const contactId = asoc.data?.results?.[0]?.id;
    if (contactId) {
      const c = await client.getRaw(`/hubspot/crm/v3/objects/contacts/${contactId}?properties=email,phone,identification_number,${ingresosProp}`);
      const cp = c.data?.properties ?? {};
      contacto = {
        email: cp.email || '',
        phone: cp.phone || '',
        identification: cp.identification_number || '',
        ingresosMensuales: cp[ingresosProp] ? Number(cp[ingresosProp]) : undefined,
      };
    }
  } catch {
    // no es critico: se sigue sin los datos del contacto
  }

  return {
    id: data.id,
    dealname: data.properties.dealname,
    hubspot_owner_id: owner.name,
    owner_name: owner.name,
    owner_email: owner.email,
    owner_phone: owner.phone,
    nombre_contacto_: data.properties.nombre_contacto || data.properties.nombre_contacto_ || '',
    proyecto_inmobiliario_cac: data.properties.proyecto_inmobiliario_cac,
    destino_del_inmueble: data.properties.destino_del_inmueble,
    alcobas: data.properties.alcobas,
    descuento_especial: data.properties.descuento_especial || undefined,
    contact_email: contacto.email,
    contact_phone: contacto.phone,
    contact_identification: contacto.identification,
    contact_ingresos_mensuales: contacto.ingresosMensuales,
  };
}

export async function fetchUserDeals(refresh = false) {
  const { data } = await client.get(`/negocios${refresh ? '?refresh=true' : ''}`);
  return data.deals;
}

// Unidades de un proyecto: solo las disponibles, o de todos los estados con `allStatuses`.
export async function fetchAvailableUnits(project, refresh = false, allStatuses = false) {
  const params = new URLSearchParams({ project });
  if (refresh) params.set('refresh', 'true');
  if (allStatuses) params.set('status', 'all');
  const { data } = await client.get(`/inventario/unidades?${params}`);
  return data.units;
}

export async function fetchTowers() {
  const { data } = await client.get('/inventario/torres');
  return data.towers;
}

export async function fetchUnitTower(unitId) {
  const { data } = await client.get(`/inventario/unidades/${unitId}/torre`);
  return data.tower;
}

// { parking, depositos, cuartosUtiles } de una torre; con dealId incluye los ya reservados por ese negocio.
export async function fetchAccessories(towerId, dealId) {
  const { data } = await client.get(`/inventario/torres/${towerId}/accesorios${dealId ? `?dealId=${encodeURIComponent(dealId)}` : ''}`);
  return data;
}

export async function associateUnitToDeal(dealId, unitId) {
  await client.post('/inventario/asociar-unidad', { dealId, unitId });
}

export async function associateParkingToDeal(dealId, parkingId) {
  await client.post('/inventario/asociar-parqueadero', { dealId, parkingId });
}

// Guarda una cotizacion con su PDF (multipart); devuelve { quoteId }.
export async function saveQuoteWithPDF(pdfBlob, datos) {
  const formData = new FormData();
  formData.append('pdf', pdfBlob, `cotizacion_${datos.dealId}_${datos.quoteTs}.pdf`);
  formData.append('data', JSON.stringify(datos));
  const { data } = await client.upload('/cotizaciones', formData);
  return data;
}

export async function fetchDealsWithQuotes() {
  const { data } = await client.get('/cotizaciones/deals');
  return data.deals;
}

export async function fetchTramites(refresh = false) {
  const { data } = await client.get(`/negocios/tramites${refresh ? '?refresh=true' : ''}`);
  return data.tramites;
}

export async function fetchQuotesByDeal(dealId) {
  const { data } = await client.get(`/cotizaciones/deal/${encodeURIComponent(dealId)}`);
  return data.quotes;
}

export async function fetchAllQuotes() {
  const { data } = await client.get('/cotizaciones/all');
  return data.quotes;
}

export async function fetchQuoteById(id) {
  const { data } = await client.get(`/cotizaciones/${id}`);
  return data;
}

export async function acceptQuoteAPI(quoteId) {
  await client.post(`/cotizaciones/${quoteId}/accept`);
}

export async function deleteQuoteAPI(quoteId) {
  await client.delete(`/cotizaciones/${quoteId}`);
}

// Configuracion financiera de todos los proyectos: { Oliv: {...} | null, ... }.
export async function fetchProjectConfigs() {
  const { data } = await client.get('/configuracion/proyectos');
  return data.configs;
}

export async function saveProjectConfig(project, config) {
  await client.put(`/configuracion/proyectos/${project}`, { config });
}

export async function fetchMyProjects() {
  const { data } = await client.get('/asesores/mis-proyectos');
  return data;
}
