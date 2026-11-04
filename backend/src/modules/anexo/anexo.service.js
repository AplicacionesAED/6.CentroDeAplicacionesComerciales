// Datos para el paquete de anexos de una cotizacion aceptada: PDFs fijos del proyecto, plano de un accesorio,
// plano de piso sombreado de una unidad y director del proyecto.
const fs = require('fs');
const path = require('path');
const ApiError = require('../../utils/ApiError');
const { OBJETO_UNIDADES, OBJETO_ACCESORIOS, OBJETO_PROYECTOS } = require('../../utils/comercial');
const { clienteDeUsuario } = require('../hubspot/hubspotApi');

// Lista cerrada: el nombre que llega por la URL nunca se usa como ruta de archivo.
const ANEXOS_ESTATICOS = {
  'especificaciones-oliv': 'especificaciones-oliv.pdf',
  'cartilla-negocios-fiduciarios': 'cartilla-negocios-fiduciarios.pdf',
};
const DIR_ANEXOS = path.join(__dirname, '..', '..', '..', 'assets', 'anexos');

function rutaAnexoEstatico(nombre) {
  const archivo = ANEXOS_ESTATICOS[nombre];
  if (!archivo) throw new ApiError(404, 'Anexo no encontrado');
  const ruta = path.join(DIR_ANEXOS, archivo);
  if (!fs.existsSync(ruta)) throw new ApiError(404, 'El archivo del anexo no está en el servidor');
  return { ruta, archivo };
}

// HubSpot responde 404 si el objeto no existe: se propaga como 404; cualquier otro fallo, tal cual.
async function leerObjeto(usuario, objeto, id, propiedades) {
  try {
    return await clienteDeUsuario(usuario.id).get(`/crm/v3/objects/${objeto}/${id}`, { properties: propiedades });
  } catch (e) {
    if (e.hubspotStatus === 404) throw new ApiError(404, 'No se encontró el objeto en HubSpot');
    throw e;
  }
}

async function planoDeAccesorio(usuario, id) {
  const r = await leerObjeto(usuario, OBJETO_ACCESORIOS, id, 'identificador_del_accesorio,plano_del_parqueadero');
  return { nombre: r.properties?.identificador_del_accesorio || '', plano: r.properties?.plano_del_parqueadero || null };
}

// La propiedad se lee EN VIVO: las cotizaciones aceptadas antes de que existiera no la tienen en su snapshot.
async function planoSombreado(usuario, unitId) {
  const r = await leerObjeto(usuario, OBJETO_UNIDADES, unitId, 'plano_piso_sombreado');
  return { plano_piso_sombreado: r.properties?.plano_piso_sombreado || null };
}

// Nombre del director del proyecto: vive en el objeto personalizado "proyectos" como el id de un owner de HubSpot.
async function directorDelProyecto(usuario, nombre) {
  const hs = clienteDeUsuario(usuario.id);
  const busqueda = await hs.post(`/crm/v3/objects/${OBJETO_PROYECTOS}/search`, {
    filterGroups: [{ filters: [{ propertyName: 'nombre_del_proyecto', operator: 'EQ', value: nombre }] }],
    properties: ['director_del_proyecto'],
    limit: 1,
  });
  const ownerId = busqueda.results?.[0]?.properties?.director_del_proyecto;
  if (!ownerId) return { director: null };
  const owner = await hs.get(`/crm/v3/owners/${ownerId}`);
  return { director: `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || null };
}

module.exports = { rutaAnexoEstatico, planoDeAccesorio, planoSombreado, directorDelProyecto };
