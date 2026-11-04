// Constantes del negocio comercial: proyectos, etapas del pipeline de HubSpot por proyecto e ids de
// los objetos personalizados de HubSpot. Ninguno es un secreto.
const PROYECTOS = ['Oliv', 'Matimba', 'Alegra', 'Almar'];

// Etapas del pipeline de negocios (deals) por proyecto: `enviada` al generar una cotizacion y
// `aceptada` al aceptarla.
const ETAPAS_POR_PROYECTO = {
  Oliv: { enviada: '1224479044', aceptada: '1275149864' },
  Matimba: { enviada: '1320365112', aceptada: '1320365114' },
  Alegra: { enviada: '1369952817', aceptada: '1369952819' },
  Almar: { enviada: '1407034413', aceptada: '1407034415' },
};

const OBJETO_UNIDADES = process.env.HUBSPOT_OBJECT_ID || '2-51798334';
const OBJETO_TORRES = '2-59650070';
// Un solo objeto guarda parqueaderos, depositos y cuartos utiles (los separa `tipo_de_accesorio`).
const OBJETO_ACCESORIOS = '2-57177606';
const OBJETO_PROYECTOS = '2-52127960';

const sanitizarNombreArchivo = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .toUpperCase();

// Correo con el que HubSpot conoce a la persona (duena de negocios): el de su cuenta de HubSpot si ya
// la conecto, si no el del usuario.
const emailComercial = (usuario) => String(usuario.hubspot_email || usuario.email || '').toLowerCase();

module.exports = {
  PROYECTOS,
  ETAPAS_POR_PROYECTO,
  OBJETO_UNIDADES,
  OBJETO_TORRES,
  OBJETO_ACCESORIOS,
  OBJETO_PROYECTOS,
  sanitizarNombreArchivo,
  emailComercial,
};
