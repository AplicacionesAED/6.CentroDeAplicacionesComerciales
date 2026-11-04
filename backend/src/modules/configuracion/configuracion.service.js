// Configuracion compartida del Centro: config financiera por proyecto, enlaces y carpetas de la
// documentacion. Solo un admin escribe (ver las rutas); cualquier autenticado lee.
const path = require('path');
const ApiError = require('../../utils/ApiError');
const { PROYECTOS, sanitizarNombreArchivo } = require('../../utils/comercial');
const { clienteDeUsuario, armarSubidaArchivo } = require('../hubspot/hubspotApi');
const AppSetting = require('./appSetting.model');

async function leer(clave) {
  const fila = await AppSetting.findByPk(clave);
  return fila ? fila.value : null;
}

async function guardar(clave, valor) {
  await AppSetting.upsert({ key: clave, value: valor });
}

async function getConfigsProyectos() {
  const configs = {};
  for (const proyecto of PROYECTOS) configs[proyecto] = await leer(`projectConfig:${proyecto}`);
  return { configs };
}

async function setConfigProyecto(proyecto, config) {
  await guardar(`projectConfig:${proyecto}`, config);
}

async function getDocUrls() {
  return { docUrls: (await leer('docUrls')) ?? {} };
}

async function setDocUrls(docUrls) {
  await guardar('docUrls', docUrls);
}

async function getDocFolders() {
  return { docFolders: (await leer('docFolders')) ?? {} };
}

async function setDocFolders(docFolders) {
  await guardar('docFolders', docFolders);
}

const MIME_WORD = new Set(['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
// Las subidas caen en la carpeta de HubSpot Files que cada equipo ya organiza a mano.
const CARPETAS_PORTAL_VENTAS = { oliv: '/Portal ventas oliv', almar: '/Portal de Ventas Almar' };

// Sube un Word al Portal de Ventas en HubSpot Files y devuelve su URL publica.
async function subirDocumentoWord(usuario, archivo, proyecto) {
  if (!archivo) throw new ApiError(400, 'No se recibió ningún archivo');
  const ext = path.extname(archivo.originalname || '').toLowerCase();
  if (!MIME_WORD.has(archivo.mimetype) && ext !== '.doc' && ext !== '.docx') throw new ApiError(400, 'Solo se permiten archivos .doc o .docx');

  const mime = MIME_WORD.has(archivo.mimetype) ? archivo.mimetype : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const nombre = `${sanitizarNombreArchivo(path.basename(archivo.originalname || 'documento', ext))}-${Date.now()}${ext || '.docx'}`;
  const carpeta = CARPETAS_PORTAL_VENTAS[(proyecto || '').toLowerCase()] || '/portal-ventas';

  const subida = await clienteDeUsuario(usuario.id).subir('/files/v3/files', armarSubidaArchivo(archivo.buffer, nombre, mime, carpeta));
  const urlHubspot = subida.url || subida.defaultHostingUrl || '';
  // Se sirve por el dominio propio de hosting de archivos del equipo, no por el de HubSpot.
  return { url: urlHubspot.replace(/^https:\/\/[^/]+/, 'https://track.aed.com.co'), filename: archivo.originalname };
}

module.exports = { getConfigsProyectos, setConfigProyecto, getDocUrls, setDocUrls, getDocFolders, setDocFolders, subirDocumentoWord };
